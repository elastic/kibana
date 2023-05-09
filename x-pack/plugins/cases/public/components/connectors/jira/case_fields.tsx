/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { map } from 'lodash/fp';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { SelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from './translations';

import type { JiraFieldsType } from '../../../../common/api';
import { useKibana } from '../../../common/lib/kibana';
import type { ConnectorFieldsProps } from '../types';
import { useGetIssueTypes } from './use_get_issue_types';
import { useGetFieldsByIssueType } from './use_get_fields_by_issue_type';
import { SearchIssues } from './search_issues';

const JiraFieldsComponent: React.FunctionComponent<ConnectorFieldsProps> = ({ connector }) => {
  const [{ fields }] = useFormData<{ fields: JiraFieldsType }>();
  const { http } = useKibana().services;

  const { issueType = null } = fields ?? {};

  const { isLoading: isLoadingIssueTypes, data: issueTypesData } = useGetIssueTypes({
    connector,
    http,
  });

  const issueTypes = issueTypesData?.data ?? [];

  const issueTypesSelectOptions = issueTypes.map((type) => ({
    text: type.name ?? '',
    value: type.id ?? '',
  }));

  const { isLoading: isLoadingFields, data: fieldsByIssueTypeData } = useGetFieldsByIssueType({
    connector,
    http,
    issueType,
  });

  const fieldsByIssueType = fieldsByIssueTypeData?.data;

  const hasPriority = fieldsByIssueType?.priority != null;
  const hasParent = fieldsByIssueType?.parent != null;

  const prioritiesSelectOptions = useMemo(() => {
    const priorities = fieldsByIssueType?.priority?.allowedValues ?? [];
    return map(
      (p) => ({
        text: p.name,
        value: p.name,
      }),
      priorities
    );
  }, [fieldsByIssueType]);

  return (
    <div data-test-subj={'connector-fields-jira'}>
      <UseField
        path="fields.issueType"
        component={SelectField}
        config={{
          label: i18n.ISSUE_TYPE,
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'issueTypeSelect',
            options: issueTypesSelectOptions,
            fullWidth: true,
            disabled: isLoadingIssueTypes,
            isLoading: isLoadingIssueTypes,
            hasNoInitialSelection: false,
          },
        }}
      />
      <EuiSpacer size="m" />
      <>
        {hasParent && (
          <>
            <EuiFlexGroup>
              <EuiFlexItem>
                <SearchIssues actionConnector={connector} />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
          </>
        )}
        {hasPriority && (
          <>
            <EuiFlexGroup>
              <EuiFlexItem>
                <UseField
                  path="fields.priority"
                  component={SelectField}
                  config={{
                    label: i18n.PRIORITY,
                  }}
                  componentProps={{
                    euiFieldProps: {
                      'data-test-subj': 'prioritySelect',
                      options: prioritiesSelectOptions,
                      fullWidth: true,
                      disabled: isLoadingIssueTypes || isLoadingFields,
                      isLoading: isLoadingFields,
                    },
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </>
    </div>
  );
};

JiraFieldsComponent.displayName = 'JiraFields';

// eslint-disable-next-line import/no-default-export
export { JiraFieldsComponent as default };
