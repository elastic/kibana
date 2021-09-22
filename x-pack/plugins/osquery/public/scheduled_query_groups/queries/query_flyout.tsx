/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import {
  EuiCallOut,
  EuiFlyout,
  EuiTitle,
  EuiSpacer,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { satisfies } from 'semver';

import { CodeEditorField } from '../../saved_queries/form/code_editor_field';
import { Form, getUseField, Field, useFormData } from '../../shared_imports';
import { PlatformCheckBoxGroupField } from './platform_checkbox_group_field';
import { ALL_OSQUERY_VERSIONS_OPTIONS } from './constants';
import {
  UseScheduledQueryGroupQueryFormProps,
  ScheduledQueryGroupFormData,
  useScheduledQueryGroupQueryForm,
} from './use_scheduled_query_group_query_form';
import { ManageIntegrationLink } from '../../components/manage_integration_link';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { ECSMappingEditorField, ECSMappingEditorFieldRef } from './lazy_ecs_mapping_editor_field';

const CommonUseField = getUseField({ component: Field });

interface QueryFlyoutProps {
  uniqueQueryIds: string[];
  defaultValue?: UseScheduledQueryGroupQueryFormProps['defaultValue'] | undefined;
  integrationPackageVersion?: string | undefined;
  onSave: (payload: ScheduledQueryGroupFormData) => Promise<void>;
  onClose: () => void;
}

const QueryFlyoutComponent: React.FC<QueryFlyoutProps> = ({
  uniqueQueryIds,
  defaultValue,
  integrationPackageVersion,
  onSave,
  onClose,
}) => {
  const ecsFieldRef = useRef<ECSMappingEditorFieldRef>();
  const [isEditMode] = useState(!!defaultValue);
  const { form } = useScheduledQueryGroupQueryForm({
    uniqueQueryIds,
    defaultValue,
    handleSubmit: async (payload, isValid) => {
      const ecsFieldValue = await ecsFieldRef?.current?.validate();

      return new Promise((resolve) => {
        if (isValid && ecsFieldValue) {
          onSave({
            ...payload,
            ...(isEmpty(ecsFieldValue) ? {} : { ecs_mapping: ecsFieldValue }),
          });
          onClose();
        }
        resolve();
      });
    },
  });

  /* Platform and version fields are supported since osquery_manager@0.3.0 */
  const isFieldSupported = useMemo(
    () => (integrationPackageVersion ? satisfies(integrationPackageVersion, '>=0.3.0') : false),
    [integrationPackageVersion]
  );

  const { submit, setFieldValue, reset, isSubmitting } = form;

  const [{ query }] = useFormData({
    form,
    watch: ['query'],
  });

  const handleSetQueryValue = useCallback(
    (savedQuery) => {
      if (!savedQuery) {
        return reset();
      }

      setFieldValue('id', savedQuery.id);
      setFieldValue('query', savedQuery.query);

      if (savedQuery.description) {
        setFieldValue('description', savedQuery.description);
      }

      if (savedQuery.interval) {
        setFieldValue('interval', savedQuery.interval);
      }

      if (isFieldSupported && savedQuery.platform) {
        setFieldValue('platform', savedQuery.platform);
      }

      if (isFieldSupported && savedQuery.version) {
        setFieldValue('version', [savedQuery.version]);
      }
    },
    [isFieldSupported, setFieldValue, reset]
  );

  /* Avoids accidental closing of the flyout when the user clicks outside of the flyout */
  const maskProps = useMemo(() => ({ onClick: () => ({}) }), []);

  return (
    <EuiFlyout
      size="m"
      onClose={onClose}
      aria-labelledby="flyoutTitle"
      outsideClickCloses={false}
      maskProps={maskProps}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="flyoutTitle">
            {isEditMode ? (
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
          {!isEditMode ? (
            <>
              <SavedQueriesDropdown onChange={handleSetQueryValue} />
              <EuiSpacer />
            </>
          ) : null}
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
                labelAppend={
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="xpack.osquery.scheduledQueryGroup.queryFlyoutForm.versionFieldOptionalLabel"
                        defaultMessage="(optional)"
                      />
                    </EuiText>
                  </EuiFlexItem>
                }
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                euiFieldProps={{
                  isDisabled: !isFieldSupported,
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
          <EuiFlexGroup>
            <EuiFlexItem>
              <CommonUseField
                path="ecs_mapping"
                component={ECSMappingEditorField}
                query={query}
                fieldRef={ecsFieldRef}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
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
            <EuiButton isLoading={isSubmitting} onClick={submit} fill>
              <FormattedMessage
                id="xpack.osquery.scheduledQueryGroup.queryFlyoutForm.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const QueryFlyout = React.memo(QueryFlyoutComponent);
