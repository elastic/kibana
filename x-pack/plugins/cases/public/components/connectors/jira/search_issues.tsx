/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, memo, useRef } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';

import {
  getFieldValidityAndErrorMessage,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useKibana } from '../../../common/lib/kibana';
import type { ActionConnector } from '../../../../common/types/domain';
import { useGetIssues } from './use_get_issues';
import * as i18n from './translations';
import { useGetIssue } from './use_get_issue';

interface Props {
  actionConnector?: ActionConnector;
  currentParent: string | null;
}

const SearchIssuesComponent: React.FC<Props> = ({ actionConnector, currentParent }) => {
  const [query, setQuery] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const { http } = useKibana().services;
  const isFirstRender = useRef(true);

  const { isFetching: isLoadingIssues, data: issuesData } = useGetIssues({
    http,
    actionConnector,
    query,
  });

  const { isFetching: isLoadingIssue, data: issueData } = useGetIssue({
    http,
    actionConnector,
    id: currentParent ?? '',
  });

  const issues = issuesData?.data ?? [];

  const options = issues.map((issue) => ({ label: issue.title, value: issue.key }));

  const issue = issueData?.data ?? null;

  if (
    isFirstRender.current &&
    !isLoadingIssue &&
    issue &&
    !selectedOptions.find((option) => option.value === issue.key)
  ) {
    setSelectedOptions([{ label: issue.title, value: issue.key }]);
  }

  return (
    <UseField path="fields.parent">
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

        const onSearchChange = (searchVal: string) => {
          setQuery(searchVal);
        };

        const onChangeComboBox = (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
          setSelectedOptions(changedOptions);
          field.setValue(changedOptions.length ? changedOptions[0].value : '');
          isFirstRender.current = false;
        };

        return (
          <EuiFormRow
            id="indexConnectorSelectSearchBox"
            fullWidth
            label={i18n.PARENT_ISSUE}
            isInvalid={isInvalid}
            error={errorMessage}
          >
            <EuiComboBox
              fullWidth
              singleSelection
              async
              placeholder={i18n.SEARCH_ISSUES_PLACEHOLDER}
              aria-label={i18n.SEARCH_ISSUES_COMBO_BOX_ARIA_LABEL}
              isLoading={isLoadingIssues}
              isInvalid={isInvalid}
              noSuggestions={!options.length}
              options={options}
              data-test-subj="search-parent-issues"
              data-testid="search-parent-issues"
              selectedOptions={selectedOptions}
              onChange={onChangeComboBox}
              onSearchChange={onSearchChange}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};
SearchIssuesComponent.displayName = 'SearchIssues';

export const SearchIssues = memo(SearchIssuesComponent);
