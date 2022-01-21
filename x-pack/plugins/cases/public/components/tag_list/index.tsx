/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiTitle,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { isEqual } from 'lodash/fp';
import * as i18n from './translations';
import { Form, FormDataProvider, useForm, getUseField, Field } from '../../common/shared_imports';
import { schema } from './schema';
import { useGetTags } from '../../containers/use_get_tags';

import { Tags } from './tags';

const CommonUseField = getUseField({ component: Field });

export interface TagListProps {
  userCanCrud?: boolean;
  isLoading: boolean;
  onSubmit: (a: string[]) => void;
  tags: string[];
}

const ColumnFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    & {
      max-width: 100%;
      @media only screen and (max-width: ${theme.eui.euiBreakpoints.m}) {
        flex-direction: row;
      }
    }
  `}
`;

export const TagList = React.memo(
  ({ userCanCrud = true, isLoading, onSubmit, tags }: TagListProps) => {
    const initialState = { tags };
    const { form } = useForm({
      defaultValue: initialState,
      options: { stripEmptyFields: false },
      schema,
    });
    const { submit } = form;
    const [isEditTags, setIsEditTags] = useState(false);

    const onSubmitTags = useCallback(async () => {
      const { isValid, data: newData } = await submit();
      if (isValid && newData.tags) {
        onSubmit(newData.tags);
        setIsEditTags(false);
      }
    }, [onSubmit, submit]);

    const { tags: tagOptions } = useGetTags();
    const [options, setOptions] = useState(
      tagOptions.map((label) => ({
        label,
      }))
    );

    useEffect(
      () =>
        setOptions(
          tagOptions.map((label) => ({
            label,
          }))
        ),
      [tagOptions]
    );
    return (
      <div>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxxs">
              <h4>{i18n.TAGS}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isLoading && <EuiLoadingSpinner data-test-subj="tag-list-loading" />}
            {!isLoading && userCanCrud && (
              <span data-test-subj="tag-list-edit">
                <EuiPopover
                  button={
                    <EuiButtonIcon
                      data-test-subj="tag-list-edit-button"
                      aria-label={i18n.EDIT_TAGS_ARIA}
                      iconType={'pencil'}
                      size="s"
                      onClick={setIsEditTags.bind(null, true)}
                    />
                  }
                  isOpen={isEditTags}
                  panelStyle={{ width: 300 }}
                  anchorPosition="downRight"
                  closePopover={setIsEditTags.bind(null, false)}
                >
                  <div data-test-subj="edit-tags">
                    <Form form={form}>
                      <CommonUseField
                        path="tags"
                        componentProps={{
                          idAria: 'caseTags',
                          'data-test-subj': 'caseTags',
                          euiFieldProps: {
                            fullWidth: true,
                            placeholder: '',
                            options,
                            noSuggestions: false,
                          },
                        }}
                      />
                      <FormDataProvider pathsToWatch="tags">
                        {({ tags: anotherTags }) => {
                          const current: string[] = options.map((opt) => opt.label);
                          const newOptions = anotherTags.reduce((acc: string[], item: string) => {
                            if (!acc.includes(item)) {
                              return [...acc, item];
                            }
                            return acc;
                          }, current);
                          if (!isEqual(current, newOptions)) {
                            setOptions(
                              newOptions.map((label: string) => ({
                                label,
                              }))
                            );
                          }
                          return null;
                        }}
                      </FormDataProvider>
                    </Form>
                    <EuiPopoverFooter>
                      <EuiFlexGroup
                        gutterSize="s"
                        alignItems="center"
                        justifyContent="flexEnd"
                        responsive={false}
                      >
                        <EuiFlexItem grow={false}>
                          <EuiButtonEmpty
                            data-test-subj="edit-tags-cancel"
                            iconType="cross"
                            onClick={setIsEditTags.bind(null, false)}
                            size="s"
                          >
                            {i18n.CANCEL}
                          </EuiButtonEmpty>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            data-test-subj="edit-tags-submit"
                            fill
                            onClick={onSubmitTags}
                            size="s"
                          >
                            {i18n.SAVE}
                          </EuiButton>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiPopoverFooter>
                  </div>
                </EuiPopover>
              </span>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" />
        <div data-test-subj="case-tags">
          {tags.length === 0 && !isEditTags && <p data-test-subj="no-tags">{i18n.NO_TAGS}</p>}
          {!isEditTags && <Tags tags={tags} color="hollow" />}
        </div>
      </div>
    );
  }
);

TagList.displayName = 'TagList';
