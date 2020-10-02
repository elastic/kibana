/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { map } from 'lodash/fp';
import {
  EuiFormRow,
  EuiSelectOption,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import * as i18n from './translations';

import { ConnectorTypes, JiraFieldsType } from '../../../../../../case/common/api/connectors';
import { useKibana } from '../../../../common/lib/kibana';
import { SettingFieldsProps } from '../types';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import { SearchIssues } from './search_issues';
import { ConnectorCard } from '../card';

const JiraSettingFieldsComponent: React.FunctionComponent<SettingFieldsProps<JiraFieldsType>> = ({
  connector,
  fields,
  isEdit,
  onChange,
}) => {
  const { issueType = null, priority = null, parent = null } = fields || {};

  const [issueTypesSelectOptions, setIssueTypesSelectOptions] = useState<EuiSelectOption[]>([]);
  const [firstLoad, setFirstLoad] = useState(false);
  const [prioritiesSelectOptions, setPrioritiesSelectOptions] = useState<EuiSelectOption[]>([]);
  const { http, notifications } = useKibana().services;

  useEffect(() => {
    setFirstLoad(true);
    onChange(fields);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { isLoading: isLoadingIssueTypes, issueTypes } = useGetIssueTypes({
    http,
    toastNotifications: notifications.toasts,
    connector,
  });

  const { isLoading: isLoadingFields, fields: fieldsByIssueType } = useGetFieldsByIssueType({
    http,
    toastNotifications: notifications.toasts,
    connector,
    issueType,
  });

  const hasPriority = useMemo(
    () => Object.prototype.hasOwnProperty.call(fieldsByIssueType, 'priority'),
    [fieldsByIssueType]
  );

  const hasParent = useMemo(
    () => Object.prototype.hasOwnProperty.call(fieldsByIssueType, 'parent'),
    [fieldsByIssueType]
  );

  useEffect(() => {
    const options = issueTypes.map((type) => ({
      value: type.id ?? '',
      text: type.name ?? '',
    }));

    setIssueTypesSelectOptions(options);
  }, [issueTypes]);

  useEffect(() => {
    if (issueType != null && fieldsByIssueType != null) {
      const priorities = fieldsByIssueType.priority?.allowedValues ?? [];
      const options = map(
        (p) => ({
          value: p.name,
          text: p.name,
        }),
        priorities
      );
      setPrioritiesSelectOptions(options);
    }
  }, [fieldsByIssueType, issueType]);

  // Reset parameters when changing connector
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    setIssueTypesSelectOptions([]);
    onChange({ issueType: null, priority: null, parent: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector]);

  // Reset fieldsByIssueType when changing connector or issue type
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    setPrioritiesSelectOptions([]);
    onChange({ issueType, priority: null, parent: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueType]);

  // Set default issue type
  useEffect(() => {
    if (!issueType && issueTypesSelectOptions.length > 0) {
      onChange({ ...fields, issueType: issueTypesSelectOptions[0].value as string });
    }
  }, [issueTypes, issueType, issueTypesSelectOptions, onChange, fields]);
  const listItems = useMemo(
    () => [
      ...(issueType != null
        ? [
            {
              title: i18n.ISSUE_TYPE,
              description: issueTypes.find((issue) => issue.id === issueType)?.name ?? '',
            },
          ]
        : []),
      ...(hasParent && parent
        ? [
            {
              title: i18n.PARENT_ISSUE,
              description: parent,
            },
          ]
        : []),
      ...(hasPriority && priority
        ? [
            {
              title: i18n.PRIORITY,
              description: priority,
            },
          ]
        : []),
    ],
    [issueType, issueTypes, hasParent, parent, hasPriority, priority]
  );

  return isEdit ? (
    <span data-test-subj={'connector-settings-jira'}>
      <EuiFormRow fullWidth label={i18n.ISSUE_TYPE}>
        <EuiSelect
          fullWidth
          isLoading={isLoadingIssueTypes}
          disabled={isLoadingIssueTypes || isLoadingFields}
          data-test-subj="issueTypeSelect"
          options={issueTypesSelectOptions}
          value={issueType ?? ''}
          onChange={(e) => {
            onChange({ ...fields, issueType: e.target.value });
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <>
        {hasParent && (
          <>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow fullWidth label={i18n.PARENT_ISSUE}>
                  <SearchIssues
                    selectedValue={parent}
                    http={http}
                    toastNotifications={notifications.toasts}
                    actionConnector={connector}
                    onChange={(parentIssueKey) => {
                      onChange({ ...fields, parent: parentIssueKey });
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        )}
        {hasPriority && (
          <>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow fullWidth label={i18n.PRIORITY}>
                  <EuiSelect
                    fullWidth
                    isLoading={isLoadingFields}
                    disabled={isLoadingIssueTypes || isLoadingFields}
                    data-test-subj="prioritySelect"
                    options={prioritiesSelectOptions}
                    value={priority ?? ''}
                    hasNoInitialSelection
                    onChange={(e) => {
                      onChange({ ...fields, priority: e.target.value });
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </>
    </span>
  ) : (
    <ConnectorCard
      connectorType={ConnectorTypes.jira}
      title={connector.name}
      listItems={listItems}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraSettingFieldsComponent as default };
