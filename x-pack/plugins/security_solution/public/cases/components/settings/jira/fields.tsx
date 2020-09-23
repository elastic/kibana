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
import { i18n } from '@kbn/i18n';

import { useKibana } from '../../../../common/lib/kibana';
import { SettingFieldsProps } from '../types';
import { JiraSettingFields } from './types';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';

const JiraSettingFieldsComponent: React.FunctionComponent<SettingFieldsProps<
  JiraSettingFields
>> = ({ fields, connector, onChange }) => {
  const { issueType, priority } = fields || {};

  const [issueTypesSelectOptions, setIssueTypesSelectOptions] = useState<EuiSelectOption[]>([]);
  const [firstLoad, setFirstLoad] = useState(false);
  const [prioritiesSelectOptions, setPrioritiesSelectOptions] = useState<EuiSelectOption[]>([]);
  const { http, notifications } = useKibana().services;

  useEffect(() => {
    setFirstLoad(true);
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
    onChange('issueType', null);
    onChange('priority', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector]);

  // Reset fieldsByIssueType when changing connector or issue type
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    setPrioritiesSelectOptions([]);
    onChange('issueType', issueType);
    onChange('priority', null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueType]);

  // Set default issue type
  useEffect(() => {
    if (!issueType && issueTypesSelectOptions.length > 0) {
      onChange('issueType', issueTypesSelectOptions[0].value as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueTypes, issueTypesSelectOptions, onChange]);

  // Set default priority
  useEffect(() => {
    if (!priority && prioritiesSelectOptions.length > 0) {
      onChange('priority', prioritiesSelectOptions[0].value as string);
    }
  }, [priority, prioritiesSelectOptions, onChange]);

  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.securitySolution.case.settings.jira.issueTypesSelectFieldLabel',
          {
            defaultMessage: 'Issue type',
          }
        )}
      >
        <EuiSelect
          fullWidth
          isLoading={isLoadingIssueTypes}
          disabled={isLoadingIssueTypes || isLoadingFields}
          data-test-subj="issueTypeSelect"
          options={issueTypesSelectOptions}
          value={issueType}
          onChange={(e) => {
            onChange('issueType', e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <>
        {hasPriority && (
          <>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.securitySolution.case.settings.jira.prioritySelectFieldLabel',
                    {
                      defaultMessage: 'Priority',
                    }
                  )}
                >
                  <EuiSelect
                    fullWidth
                    isLoading={isLoadingFields}
                    disabled={isLoadingIssueTypes || isLoadingFields}
                    data-test-subj="prioritySelect"
                    options={prioritiesSelectOptions}
                    value={priority}
                    onChange={(e) => {
                      onChange('priority', e.target.value);
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraSettingFieldsComponent as default };
