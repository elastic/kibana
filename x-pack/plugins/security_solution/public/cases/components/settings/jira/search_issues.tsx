/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useEffect, useCallback, useState, memo } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { useKibana } from '../../../../common/lib/kibana';
import { ActionConnector } from '../../../containers/types';
import { useGetIssues } from './use_get_issues';
import { useGetSingleIssue } from './use_get_single_issue';
import * as i18n from './translations';

interface Props {
  selectedValue: string | null;
  actionConnector?: ActionConnector;
  onChange: (parentIssueKey: string) => void;
}

const SearchIssuesComponent: React.FC<Props> = ({ selectedValue, actionConnector, onChange }) => {
  const [query, setQuery] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const { http, notifications } = useKibana().services;

  const { isLoading: isLoadingIssues, issues } = useGetIssues({
    http,
    toastNotifications: notifications.toasts,
    actionConnector,
    query,
  });

  const { isLoading: isLoadingSingleIssue, issue: singleIssue } = useGetSingleIssue({
    http,
    toastNotifications: notifications.toasts,
    actionConnector,
    id: selectedValue,
  });

  useEffect(() => setOptions(issues.map((issue) => ({ label: issue.title, value: issue.key }))), [
    issues,
  ]);

  useEffect(() => {
    if (isLoadingSingleIssue || singleIssue == null) {
      return;
    }

    const singleIssueAsOptions = [{ label: singleIssue.title, value: singleIssue.key }];
    setOptions(singleIssueAsOptions);
    setSelectedOptions(singleIssueAsOptions);
  }, [singleIssue, isLoadingSingleIssue]);

  const onSearchChange = useCallback((searchVal: string) => {
    setQuery(searchVal);
  }, []);

  const onChangeComboBox = useCallback(
    (changedOptions) => {
      setSelectedOptions(changedOptions);
      onChange(changedOptions[0].value);
    },
    [onChange]
  );

  const inputPlaceholder = useMemo(
    (): string =>
      isLoadingIssues || isLoadingSingleIssue
        ? i18n.SEARCH_ISSUES_LOADING
        : i18n.SEARCH_ISSUES_PLACEHOLDER,
    [isLoadingIssues, isLoadingSingleIssue]
  );

  return (
    <EuiComboBox
      singleSelection
      fullWidth
      placeholder={inputPlaceholder}
      data-test-subj={'search-parent-issues'}
      aria-label={i18n.SEARCH_ISSUES_COMBO_BOX_ARIA_LABEL}
      options={options}
      isLoading={isLoadingIssues || isLoadingSingleIssue}
      onSearchChange={onSearchChange}
      selectedOptions={selectedOptions}
      onChange={onChangeComboBox}
    />
  );
};

export const SearchIssues = memo(SearchIssuesComponent);
