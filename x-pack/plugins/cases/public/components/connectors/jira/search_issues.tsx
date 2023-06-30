/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, memo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';

import {
  getFieldValidityAndErrorMessage,
  UseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useKibana } from '../../../common/lib/kibana';
import type { ActionConnector } from '../../../../common/api';
import { useGetIssues } from './use_get_issues';
import * as i18n from './translations';

interface Props {
  actionConnector?: ActionConnector;
}

const SearchIssuesComponent: React.FC<Props> = ({ actionConnector }) => {
  const [query, setQuery] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const { http } = useKibana().services;

  const { isFetching: isLoadingIssues, data: issuesData } = useGetIssues({
    http,
    actionConnector,
    query,
  });

  const issues = issuesData?.data ?? [];

  const options = issues.map((issue) => ({ label: issue.title, value: issue.key }));

  return (
    <UseField path="fields.parent">
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

        const onSearchChange = (searchVal: string) => {
          setQuery(searchVal);
        };

        const onChangeComboBox = (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
          setSelectedOptions(changedOptions);
          field.setValue(changedOptions[0].value ?? '');
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
