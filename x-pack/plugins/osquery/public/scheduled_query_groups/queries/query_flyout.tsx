/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCallOut,
  EuiFlyout,
  EuiTitle,
  EuiSpacer,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiPortal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { satisfies } from 'semver';

import { OsqueryManagerPackagePolicyConfigRecord } from '../../../common/types';
import { CodeEditorField } from '../../queries/form/code_editor_field';
import { Form, getUseField, Field } from '../../shared_imports';
import { PlatformCheckBoxGroupField } from './platform_checkbox_group_field';
import { ALL_OSQUERY_VERSIONS_OPTIONS } from './constants';
import {
  UseScheduledQueryGroupQueryFormProps,
  useScheduledQueryGroupQueryForm,
} from './use_scheduled_query_group_query_form';
import { ManageIntegrationLink } from '../../components/manage_integration_link';

const CommonUseField = getUseField({ component: Field });

interface QueryFlyoutProps {
  defaultValue?: UseScheduledQueryGroupQueryFormProps['defaultValue'] | undefined;
  integrationPackageVersion?: string | undefined;
  onSave: (payload: OsqueryManagerPackagePolicyConfigRecord) => Promise<void>;
  onClose: () => void;
}

const QueryFlyoutComponent: React.FC<QueryFlyoutProps> = ({
  defaultValue,
  integrationPackageVersion,
  onSave,
  onClose,
}) => {
  const { form } = useScheduledQueryGroupQueryForm({
    defaultValue,
    handleSubmit: (payload, isValid) =>
      new Promise((resolve) => {
        if (isValid) {
          onSave(payload);
          onClose();
        }
        resolve();
      }),
  });

  /* Platform and version fields are supported since osquer_manger@0.3.0 */
  const isFieldSupported = useMemo(
    () => (integrationPackageVersion ? satisfies(integrationPackageVersion, '>=0.3.0') : false),
    [integrationPackageVersion]
  );

  const { submit } = form;

  return (
    <EuiPortal>
      <EuiFlyout size="m" ownFocus onClose={onClose} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="flyoutTitle">
              {defaultValue ? (
                <FormattedMessage
                  id="xpack.osquery.scheduleQueryGroup.queryFlyoutForm.editFormTitle"
                  defaultMessage="Edit query"
                />
              ) : (
                <FormattedMessage
                  id="xpack.osquery.scheduleQueryGroup.queryFlyoutForm.addFormTitle"
                  defaultMessage="Attach next query"
                />
              )}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <Form form={form}>
            <CommonUseField path="id" />
            <EuiSpacer />
            <CommonUseField path="query" component={CodeEditorField} />
            <EuiSpacer />
            <EuiFlexGroup>
              <EuiFlexItem>
                <CommonUseField
                  path="interval"
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  euiFieldProps={{ append: 's' }}
                />
                <EuiSpacer />
                <CommonUseField
                  path="version"
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  euiFieldProps={{
                    isDisabled: !isFieldSupported,
                    noSuggestions: false,
                    singleSelection: { asPlainText: true },
                    placeholder: ALL_OSQUERY_VERSIONS_OPTIONS[0].label,
                    options: ALL_OSQUERY_VERSIONS_OPTIONS,
                    onCreateOption: undefined,
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <CommonUseField
                  path="platform"
                  component={PlatformCheckBoxGroupField}
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  euiFieldProps={{ disabled: !isFieldSupported }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
          </Form>
          {!isFieldSupported ? (
            <EuiCallOut
              size="s"
              title={
                <FormattedMessage
                  id="xpack.osquery.scheduleQueryGroup.queryFlyoutForm.unsupportedPlatformAndVersionFieldsCalloutTitle"
                  defaultMessage="Platform and version fields are available from {version}"
                  // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                  values={{ version: `osquery_manager@0.3.0` }}
                />
              }
              iconType="pin"
            >
              <EuiFlexGroup gutterSize="none">
                <EuiFlexItem grow={false}>
                  <ManageIntegrationLink />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiCallOut>
          ) : null}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.osquery.scheduledQueryGroup.queryFlyoutForm.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={submit} fill>
                <FormattedMessage
                  id="xpack.osquery.scheduledQueryGroup.queryFlyoutForm.saveButtonLabel"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};

export const QueryFlyout = React.memo(QueryFlyoutComponent);
