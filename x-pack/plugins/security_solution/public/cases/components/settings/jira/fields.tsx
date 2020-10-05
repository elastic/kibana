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

  const { isLoading: isLoadingIssueTypes, issueTypes } = useGetIssueTypes({
    http,
    toastNotifications: notifications.toasts,
    connector,
  });

  const issueTypesSelectOptions = useMemo(
    () =>
      issueTypes.map((type) => ({
        value: type.id ?? '',
        text: type.name ?? '',
      })),
    [issueTypes]
  );

  const currentIssueType = useMemo(() => {
    if (!issueType && issueTypesSelectOptions.length > 0) {
      return issueTypesSelectOptions[0].value;
    }

    return issueType;
  }, [issueType, issueTypesSelectOptions]);

  const { isLoading: isLoadingFields, fields: fieldsByIssueType } = useGetFieldsByIssueType({
    http,
    toastNotifications: notifications.toasts,
    connector,
    issueType: currentIssueType,
  });

  const hasPriority = useMemo(
    () => Object.prototype.hasOwnProperty.call(fieldsByIssueType, 'priority'),
    [fieldsByIssueType]
  );

  const hasParent = useMemo(
    () => Object.prototype.hasOwnProperty.call(fieldsByIssueType, 'parent'),
    [fieldsByIssueType]
  );

  const prioritiesSelectOptions = useMemo(() => {
    const priorities = fieldsByIssueType.priority?.allowedValues ?? [];
    return map(
      (p) => ({
        value: p.name,
        text: p.name,
      }),
      priorities
    );
  }, [fieldsByIssueType]);

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

  const onFieldChange = useCallback(
    (key, value) => {
      onChange({
        ...fields,
        issueType: currentIssueType,
        priority,
        parent,
        [key]: value,
      });
    },
    [currentIssueType, fields, onChange, parent, priority]
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
          value={currentIssueType ?? ''}
          onChange={(e) => onFieldChange('issueType', e.target.value)}
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
                    onChange={(parentIssueKey) => onFieldChange('parent', parentIssueKey)}
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
                    onChange={(e) => onFieldChange('priority', e.target.value)}
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
