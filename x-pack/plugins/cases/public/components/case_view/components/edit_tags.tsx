/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiTitle,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiLoadingSpinner,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, useForm, UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ComboBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import * as i18n from '../../tags/translations';
import { useGetTags } from '../../../containers/use_get_tags';
import { Tags } from '../../tags/tags';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { schemaTags } from '../../create/schema';

export const schema: FormSchema = {
  tags: schemaTags,
};

export interface EditTagsProps {
  isLoading: boolean;
  onSubmit: (a: string[]) => void;
  tags: string[];
}

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
  const { euiTheme } = useEuiTheme();

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

  const options = tagOptions.map((label) => ({
    label,
  }));

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        justifyContent="spaceBetween"
        responsive={false}
        data-test-subj="case-view-tag-list"
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{i18n.TAGS}</h3>
          </EuiTitle>
        </EuiFlexItem>
        {isLoading && <EuiLoadingSpinner data-test-subj="tag-list-loading" />}
        {!isLoading && permissions.update && (
          <EuiFlexItem data-test-subj="tag-list-edit" grow={false}>
            <EuiButtonIcon
              data-test-subj="tag-list-edit-button"
              aria-label={i18n.EDIT_TAGS_ARIA}
              iconType={'pencil'}
              onClick={() => setIsEditTags(true)}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <EuiFlexGroup
        css={css`
          width: 100%;
          p {
            font-size: ${euiTheme.size.m};
            margin-block-end: unset;
          }
        `}
        gutterSize="none"
        data-test-subj="case-tags"
      >
        {tags.length === 0 && !isEditTags && <p data-test-subj="no-tags">{i18n.NO_TAGS}</p>}
        {!isEditTags && (
          <EuiFlexItem>
            <Tags tags={tags} color="hollow" />
          </EuiFlexItem>
        )}
        {isEditTags && (
          <EuiFlexGroup
            css={css`
              & {
                max-width: 100%;
                @media only screen and (max-width: ${euiTheme.breakpoint.m}) {
                  flex-direction: row;
                }
              }
            `}
            data-test-subj="edit-tags"
            direction="column"
          >
            <EuiFlexItem>
              <Form form={form}>
                <UseField
                  path="tags"
                  component={ComboBoxField}
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
                    onClick={() => setIsEditTags(false)}
                    size="s"
                  >
                    {i18n.CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
    </EuiFlexItem>
  );
});

EditTags.displayName = 'EditTags';
