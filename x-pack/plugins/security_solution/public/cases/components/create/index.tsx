/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { useHistory } from 'react-router-dom';

import { isEqual } from 'lodash/fp';
import { CasePostRequest } from '../../../../../case/common/api';
import {
  Field,
  Form,
  getUseField,
  useForm,
  UseField,
  FormDataProvider,
} from '../../../shared_imports';
import { usePostCase } from '../../containers/use_post_case';
import { schema } from './schema';
import { InsertTimelinePopover } from '../../../timelines/components/timeline/insert_timeline_popover';
import { useInsertTimeline } from '../../../timelines/components/timeline/insert_timeline_popover/use_insert_timeline';
import * as i18n from '../../translations';
import { MarkdownEditorForm } from '../../../common/components//markdown_editor/form';
import { useGetTags } from '../../containers/use_get_tags';
import { getCaseDetailsUrl } from '../../../common/components/link_to';

export const CommonUseField = getUseField({ component: Field });

const ContainerBig = styled.div`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeXL};
  `}
`;

const Container = styled.div`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSize};
  `}
`;
const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 99;
`;

const initialCaseValue: CasePostRequest = {
  description: '',
  tags: [],
  title: '',
};

export const Create = React.memo(() => {
  const history = useHistory();
  const { caseData, isLoading, postCase } = usePostCase();
  const { form } = useForm<CasePostRequest>({
    defaultValue: initialCaseValue,
    options: { stripEmptyFields: false },
    schema,
  });
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
  const { handleCursorChange, handleOnTimelineChange } = useInsertTimeline<CasePostRequest>(
    form,
    'description'
  );

  const onSubmit = useCallback(async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      // `postCase`'s type is incorrect, it actually returns a promise
      await postCase(data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const handleSetIsCancel = useCallback(() => {
    history.push('/');
  }, [history]);

  if (caseData != null && caseData.id) {
    history.push(getCaseDetailsUrl({ id: caseData.id }));
    return null;
  }

  return (
    <EuiPanel>
      {isLoading && <MySpinner data-test-subj="create-case-loading-spinner" size="xl" />}
      <Form form={form}>
        <CommonUseField
          path="title"
          componentProps={{
            idAria: 'caseTitle',
            'data-test-subj': 'caseTitle',
            euiFieldProps: {
              fullWidth: false,
              disabled: isLoading,
            },
          }}
        />
        <Container>
          <CommonUseField
            path="tags"
            componentProps={{
              idAria: 'caseTags',
              'data-test-subj': 'caseTags',
              euiFieldProps: {
                fullWidth: true,
                placeholder: '',
                disabled: isLoading,
                options,
                noSuggestions: false,
              },
            }}
          />
        </Container>
        <ContainerBig>
          <UseField
            path="description"
            component={MarkdownEditorForm}
            componentProps={{
              dataTestSubj: 'caseDescription',
              idAria: 'caseDescription',
              isDisabled: isLoading,
              onCursorPositionUpdate: handleCursorChange,
              topRightContent: (
                <InsertTimelinePopover
                  hideUntitled={true}
                  isDisabled={isLoading}
                  onTimelineChange={handleOnTimelineChange}
                />
              ),
            }}
          />
        </ContainerBig>
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
      <Container>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexEnd"
          gutterSize="xs"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="create-case-cancel"
              size="s"
              onClick={handleSetIsCancel}
              iconType="cross"
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="create-case-submit"
              fill
              iconType="plusInCircle"
              isDisabled={isLoading}
              isLoading={isLoading}
              onClick={onSubmit}
            >
              {i18n.CREATE_CASE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Container>
    </EuiPanel>
  );
});

Create.displayName = 'Create';
