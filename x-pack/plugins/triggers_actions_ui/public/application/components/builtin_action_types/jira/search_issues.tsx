/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useEffect, useCallback, useState, memo } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { HttpSetup, IToasts } from 'kibana/public';
import { ActionConnector } from '../../../../types';
import { useGetIssues } from './use_get_issues';
import { useGetSingleIssue } from './use_get_single_issue';
import * as i18n from './translations';

interface Props {
  selectedValue?: string | null;
  http: HttpSetup;
  toastNotifications: IToasts;
  actionConnector?: ActionConnector;
  onChange: (parentIssueKey: string) => void;
}

const SearchIssuesComponent: React.FC<Props> = ({
  selectedValue,
  http,
  toastNotifications,
  actionConnector,
  onChange,
}) => {
  const [query, setQuery] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);

  const { isLoading: isLoadingIssues, issues } = useGetIssues({
    http,
    toastNotifications,
    actionConnector,
    query,
  });

  const { isLoading: isLoadingSingleIssue, issue: singleIssue } = useGetSingleIssue({
    http,
    toastNotifications,
    actionConnector,
    id: selectedValue,
  });

  useEffect(
    () => setOptions(issues.map((issue) => ({ label: issue.title, value: issue.key }))),
    [issues]
  );

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
      data-test-sub={'search-parent-issues'}
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
