/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { ALL_OSQUERY_VERSIONS_OPTIONS } from '../../scheduled_query_groups/queries/constants';
import { PlatformCheckBoxGroupField } from '../../scheduled_query_groups/queries/platform_checkbox_group_field';
import { Field, getUseField, UseField } from '../../shared_imports';
import { CodeEditorField } from './code_editor_field';

export const CommonUseField = getUseField({ component: Field });

interface SavedQueryFormProps {
  viewMode?: boolean;
}

const SavedQueryFormComponent: React.FC<SavedQueryFormProps> = ({ viewMode }) => {
  const euiFieldProps = useMemo(
    () => ({
      isDisabled: !!viewMode,
    }),
    [viewMode]
  );

  return (
    <>
      <CommonUseField path="id" euiFieldProps={euiFieldProps} />
      <EuiSpacer />
      <CommonUseField path="description" euiFieldProps={euiFieldProps} />
      <EuiSpacer />
      <UseField path="query" component={CodeEditorField} euiFieldProps={euiFieldProps} />
      <EuiSpacer size="xl" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h5>
              <FormattedMessage
                id="xpack.osquery.savedQueries.form.scheduledQueryGroupConfigSection.title"
                defaultMessage="Scheduled query group configuration"
              />
            </h5>
          </EuiTitle>
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.osquery.savedQueries.form.scheduledQueryGroupConfigSection.description"
              defaultMessage="The options listed below are optional and are only applied when the query is assigned to a scheduled query group."
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          <CommonUseField
            path="interval"
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            euiFieldProps={{ append: 's', ...euiFieldProps }}
          />
          <EuiSpacer />
          <CommonUseField
            path="version"
            // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
            euiFieldProps={{
              noSuggestions: false,
              singleSelection: { asPlainText: true },
              placeholder: i18n.translate(
                'xpack.osquery.scheduledQueryGroup.queriesTable.osqueryVersionAllLabel',
                {
                  defaultMessage: 'ALL',
                }
              ),
              options: ALL_OSQUERY_VERSIONS_OPTIONS,
              onCreateOption: undefined,
              ...euiFieldProps,
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <CommonUseField path="platform" component={PlatformCheckBoxGroupField} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </>
  );
};

export const SavedQueryForm = React.memo(SavedQueryFormComponent);
