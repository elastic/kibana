/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { isEqual } from 'lodash/fp';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  Form,
  FormDataProvider,
  useForm,
  getUseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import * as i18n from '../../tags/translations';
import { useGetTags } from '../../../containers/use_get_tags';
import { Tags } from '../../tags/tags';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { schemaTags } from '../../create/schema';

export const schema: FormSchema = {
  tags: schemaTags,
};

const CommonUseField = getUseField({ component: Field });

export interface EditTagsProps {
  isLoading: boolean;
  onSubmit: (a: string[]) => void;
  tags: string[];
}

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    width: 100%;
    p {
      font-size: ${theme.eui.euiSizeM};
      margin-block-end: unset;
    }
  `}
`;

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

export const EditTags = React.memo(({ isLoading, onSubmit, tags }: EditTagsProps) => {
  const { permissions } = useCasesContext();
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
      const trimmedTags = newData.tags.map((tag: string) => tag.trim());

      onSubmit(trimmedTags);
      form.reset({ defaultValue: newData });
      setIsEditTags(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSubmit, submit]);

  const { data: tagOptions = [] } = useGetTags();
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
    <EuiFlexItem grow={false}>
      <EuiText data-test-subj="case-view-tag-list">
        <EuiFlexGroup
          alignItems="center"
          gutterSize="none"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <h4>{i18n.TAGS}</h4>
          </EuiFlexItem>
          {isLoading && <EuiLoadingSpinner data-test-subj="tag-list-loading" />}
          {!isLoading && permissions.update && (
            <EuiFlexItem data-test-subj="tag-list-edit" grow={false}>
              <EuiButtonIcon
                data-test-subj="tag-list-edit-button"
                aria-label={i18n.EDIT_TAGS_ARIA}
                iconType={'pencil'}
                onClick={setIsEditTags.bind(null, true)}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" />
        <MyFlexGroup gutterSize="none" data-test-subj="case-tags">
          {tags.length === 0 && !isEditTags && <p data-test-subj="no-tags">{i18n.NO_TAGS}</p>}
          {!isEditTags && (
            <EuiFlexItem>
              <Tags tags={tags} color="hollow" />
            </EuiFlexItem>
          )}
          {isEditTags && (
            <ColumnFlexGroup data-test-subj="edit-tags" direction="column">
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
                        customOptionText: i18n.ADD_TAG_CUSTOM_OPTION_LABEL_COMBO_BOX,
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
                <EuiFlexGroup alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="success"
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
            </ColumnFlexGroup>
          )}
        </MyFlexGroup>
      </EuiText>
    </EuiFlexItem>
  );
});

EditTags.displayName = 'EditTags';
