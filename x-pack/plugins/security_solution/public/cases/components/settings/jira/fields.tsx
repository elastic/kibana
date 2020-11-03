/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { map } from 'lodash/fp';
import { EuiFormRow, EuiSelect, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
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
  isEdit = true,
  onChange,
}) => {
  const { issueType = null, priority = null, parent = null } = fields ?? {};
  const { http, notifications } = useKibana().services;

  const handleIssueType = useCallback(
    (issueTypeSelectOptions: Array<{ value: string; text: string }>) => {
      if (issueType == null && issueTypeSelectOptions.length > 0) {
        // if there is no issue type set in the edit view, set it to default
        if (isEdit) {
          onChange({
            issueType: issueTypeSelectOptions[0].value,
            parent,
            priority,
          });
        }
      }
    },
    [isEdit, issueType, onChange, parent, priority]
  );
  const { isLoading: isLoadingIssueTypes, issueTypes } = useGetIssueTypes({
    connector,
    http,
    toastNotifications: notifications.toasts,
    handleIssueType,
  });

  const issueTypesSelectOptions = useMemo(
    () =>
      issueTypes.map((type) => ({
        text: type.name ?? '',
        value: type.id ?? '',
      })),
    [issueTypes]
  );

  const currentIssueType = useMemo(() => {
    if (!issueType && issueTypesSelectOptions.length > 0) {
      return issueTypesSelectOptions[0].value;
    } else if (
      issueTypesSelectOptions.length > 0 &&
      !issueTypesSelectOptions.some(({ value }) => value === issueType)
    ) {
      return issueTypesSelectOptions[0].value;
    }
    return issueType;
  }, [issueType, issueTypesSelectOptions]);

  const { isLoading: isLoadingFields, fields: fieldsByIssueType } = useGetFieldsByIssueType({
    connector,
    http,
    issueType: currentIssueType,
    toastNotifications: notifications.toasts,
  });

  const hasPriority = useMemo(() => fieldsByIssueType.priority != null, [fieldsByIssueType]);

  const hasParent = useMemo(() => fieldsByIssueType.parent != null, [fieldsByIssueType]);

  const prioritiesSelectOptions = useMemo(() => {
    const priorities = fieldsByIssueType.priority?.allowedValues ?? [];
    return map(
      (p) => ({
        text: p.name,
        value: p.name,
      }),
      priorities
    );
  }, [fieldsByIssueType]);

  const listItems = useMemo(
    () => [
      ...(issueType != null && issueType.length > 0
        ? [
            {
              title: i18n.ISSUE_TYPE,
              description: issueTypes.find((issue) => issue.id === issueType)?.name ?? '',
            },
          ]
        : []),
      ...(parent != null && parent.length > 0
        ? [
            {
              title: i18n.PARENT_ISSUE,
              description: parent,
            },
          ]
        : []),
      ...(priority != null && priority.length > 0
        ? [
            {
              title: i18n.PRIORITY,
              description: priority,
            },
          ]
        : []),
    ],
    [issueType, issueTypes, parent, priority]
  );

  const onFieldChange = useCallback(
    (key, value) => {
      if (key === 'issueType') {
        return onChange({ ...fields, issueType: value, priority: null, parent: null });
      }
      return onChange({
        ...fields,
        issueType: currentIssueType,
        parent,
        priority,
        [key]: value,
      });
    },
    [currentIssueType, fields, onChange, parent, priority]
  );

  return isEdit ? (
    <span data-test-subj={'connector-settings-jira'}>
      <EuiFormRow fullWidth label={i18n.ISSUE_TYPE}>
        <EuiSelect
          data-test-subj="issueTypeSelect"
          disabled={isLoadingIssueTypes || isLoadingFields}
          fullWidth
          isLoading={isLoadingIssueTypes}
          onChange={(e) => onFieldChange('issueType', e.target.value)}
          options={issueTypesSelectOptions}
          value={currentIssueType ?? ''}
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
                    actionConnector={connector}
                    onChange={(parentIssueKey) => onFieldChange('parent', parentIssueKey)}
                    selectedValue={parent}
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
                    data-test-subj="prioritySelect"
                    disabled={isLoadingIssueTypes || isLoadingFields}
                    fullWidth
                    hasNoInitialSelection
                    isLoading={isLoadingFields}
                    onChange={(e) => onFieldChange('priority', e.target.value)}
                    options={prioritiesSelectOptions}
                    value={priority ?? ''}
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
      isLoading={isLoadingIssueTypes || isLoadingFields}
      listItems={listItems}
      title={connector.name}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraSettingFieldsComponent as default };
