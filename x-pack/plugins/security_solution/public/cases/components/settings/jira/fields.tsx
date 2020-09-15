/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState, useMemo } from 'react';
import { map } from 'lodash/fp';
import {
  EuiFormRow,
  EuiComboBox,
  EuiSelectOption,
  EuiHorizontalRule,
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

const JiraSettingFields: React.FunctionComponent<SettingFieldsProps<JiraSettingFields>> = ({
  fields,
  connector,
  onChange,
}) => {
  const { issueType, priority, labels } = fields || {};

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

  const hasLabels = useMemo(
    () => Object.prototype.hasOwnProperty.call(fieldsByIssueType, 'labels'),
    [fieldsByIssueType]
  );
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

  const labelOptions = useMemo(() => (labels ? labels.map((label: string) => ({ label })) : []), [
    labels,
  ]);

  // Reset parameters when changing connector
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    setIssueTypesSelectOptions([]);
    onChange('fields', {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector]);

  // Reset fieldsByIssueType when changing connector or issue type
  useEffect(() => {
    if (!firstLoad) {
      return;
    }

    setPrioritiesSelectOptions([]);
    onChange('fields', { issueType });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueType]);

  // Set default issue type
  useEffect(() => {
    if (!issueType && issueTypesSelectOptions.length > 0) {
      onChange('fields', { ...fields, issueType: issueTypesSelectOptions[0].value as string });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueTypes, issueTypesSelectOptions]);

  // Set default priority
  useEffect(() => {
    if (!priority && prioritiesSelectOptions.length > 0) {
      onChange('fields', { ...fields, priority: prioritiesSelectOptions[0].value as string });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connector, issueType, prioritiesSelectOptions]);

  return (
    <>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.jira.urgencySelectFieldLabel',
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
            onChange('fields', { ...fields, issueType: e.target.value });
          }}
        />
      </EuiFormRow>
      <EuiHorizontalRule />
      <>
        {hasPriority && (
          <>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.triggersActionsUI.components.builtinActionTypes.jira.severitySelectFieldLabel',
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
                      onChange('fields', { ...fields, priority: e.target.value });
                    }}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        )}
        {hasLabels && (
          <>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.triggersActionsUI.components.builtinActionTypes.jira.impactSelectFieldLabel',
                    {
                      defaultMessage: 'Labels (optional)',
                    }
                  )}
                >
                  <EuiComboBox
                    noSuggestions
                    fullWidth
                    isLoading={isLoadingFields}
                    isDisabled={isLoadingIssueTypes || isLoadingFields}
                    selectedOptions={labelOptions}
                    onCreateOption={(searchValue: string) => {
                      const newOptions = [...labelOptions, { label: searchValue }];
                      onChange('fields', {
                        ...fields,
                        labels: newOptions.map((newOption) => newOption.label),
                      });
                    }}
                    onChange={(selectedOptions: Array<{ label: string }>) => {
                      onChange('fields', {
                        ...fields,
                        labels: selectedOptions.map((selectedOption) => selectedOption.label),
                      });
                    }}
                    onBlur={() => {
                      if (!labels) {
                        onChange('fields', {
                          ...fields,
                          labels: [],
                        });
                      }
                    }}
                    isClearable={true}
                    data-test-subj="labelsComboBox"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        )}
      </>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { JiraSettingFields as default };
