/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { isEqual } from 'lodash/fp';
import * as i18n from './translations';
import { Form, FormDataProvider, useForm } from '../../../shared_imports';
import { schema } from './schema';
import { CommonUseField } from '../create';
import { useGetTags } from '../../containers/use_get_tags';

interface TagListProps {
  disabled?: boolean;
  isLoading: boolean;
  onSubmit: (a: string[]) => void;
  tags: string[];
}

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeM};
    p {
      font-size: ${theme.eui.euiSizeM};
    }
  `}
`;

export const TagList = React.memo(
  ({ disabled = false, isLoading, onSubmit, tags }: TagListProps) => {
    const { form } = useForm({
      defaultValue: { tags },
      options: { stripEmptyFields: false },
      schema,
    });
    const [isEditTags, setIsEditTags] = useState(false);

    const onSubmitTags = useCallback(async () => {
      const { isValid, data: newData } = await form.submit();
      if (isValid && newData.tags) {
        onSubmit(newData.tags);
        setIsEditTags(false);
      }
    }, [form, onSubmit]);
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
      <EuiText>
        <EuiFlexGroup alignItems="center" gutterSize="xs" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <h4>{i18n.TAGS}</h4>
          </EuiFlexItem>
          {isLoading && <EuiLoadingSpinner data-test-subj="tag-list-loading" />}
          {!isLoading && (
            <EuiFlexItem data-test-subj="tag-list-edit" grow={false}>
              <EuiButtonIcon
                data-test-subj="tag-list-edit-button"
                isDisabled={disabled}
                aria-label={i18n.EDIT_TAGS_ARIA}
                iconType={'pencil'}
                onClick={setIsEditTags.bind(null, true)}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" />
        <MyFlexGroup gutterSize="xs" data-test-subj="case-tags">
          {tags.length === 0 && !isEditTags && <p data-test-subj="no-tags">{i18n.NO_TAGS}</p>}
          {tags.length > 0 &&
            !isEditTags &&
            tags.map((tag, key) => (
              <EuiFlexItem grow={false} key={`${tag}${key}`}>
                <EuiBadge data-test-subj="case-tag" color="hollow">
                  {tag}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          {isEditTags && (
            <EuiFlexGroup data-test-subj="edit-tags" direction="column">
              <EuiFlexItem>
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
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="secondary"
                      data-test-subj="edit-tags-submit"
                      fill
                      iconType="save"
                      onClick={onSubmitTags}
                      size="s"
                    >
                      {i18n.SAVE}
                    </EuiButton>
                  </EuiFlexItem>
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
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </MyFlexGroup>
      </EuiText>
    );
  }
);

TagList.displayName = 'TagList';
