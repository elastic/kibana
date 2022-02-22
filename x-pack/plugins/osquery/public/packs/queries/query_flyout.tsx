/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import {
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
import { FormattedMessage } from '@kbn/i18n-react';

import { CodeEditorField } from '../../saved_queries/form/code_editor_field';
import { Form, getUseField, Field, useFormData } from '../../shared_imports';
import { PlatformCheckBoxGroupField } from './platform_checkbox_group_field';
import { ALL_OSQUERY_VERSIONS_OPTIONS } from './constants';
import { UsePackQueryFormProps, PackFormData, usePackQueryForm } from './use_pack_query_form';
import { SavedQueriesDropdown } from '../../saved_queries/saved_queries_dropdown';
import { ECSMappingEditorField, ECSMappingEditorFieldRef } from './lazy_ecs_mapping_editor_field';

const CommonUseField = getUseField({ component: Field });

interface QueryFlyoutProps {
  uniqueQueryIds: string[];
  defaultValue?: UsePackQueryFormProps['defaultValue'] | undefined;
  onSave: (payload: PackFormData) => Promise<void>;
  onClose: () => void;
}

const QueryFlyoutComponent: React.FC<QueryFlyoutProps> = ({
  uniqueQueryIds,
  defaultValue,
  onSave,
  onClose,
}) => {
  const ecsFieldRef = useRef<ECSMappingEditorFieldRef>();
  const [isEditMode] = useState(!!defaultValue);
  const { form } = usePackQueryForm({
    uniqueQueryIds,
    defaultValue,
    handleSubmit: async (payload, isValid) => {
      const ecsFieldValue = await ecsFieldRef?.current?.validate();
      const isEcsFieldValueValid =
        ecsFieldValue &&
        Object.values(ecsFieldValue).every((field) => !isEmpty(Object.values(field)[0]));

      return new Promise((resolve) => {
        if (isValid && isEcsFieldValueValid) {
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

  const { submit, setFieldValue, reset, isSubmitting, validate } = form;

  const [{ query }] = useFormData({
    form,
    watch: ['query'],
  });

  const handleSetQueryValue = useCallback(
    (savedQuery) => {
      reset();

      if (savedQuery) {
        setFieldValue('id', savedQuery.id);
        setFieldValue('query', savedQuery.query);

        if (savedQuery.description) {
          setFieldValue('description', savedQuery.description);
        }

        if (savedQuery.interval) {
          setFieldValue('interval', savedQuery.interval);
        }

        if (savedQuery.platform) {
          setFieldValue('platform', savedQuery.platform);
        }

        if (savedQuery.version) {
          setFieldValue('version', [savedQuery.version]);
        }

        if (savedQuery.ecs_mapping) {
          setFieldValue('ecs_mapping', savedQuery.ecs_mapping);
        }
      }

      validate();
    },
    [reset, validate, setFieldValue]
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
                id="xpack.osquery.queryFlyoutForm.editFormTitle"
                defaultMessage="Edit query"
              />
            ) : (
              <FormattedMessage
                id="xpack.osquery.queryFlyoutForm.addFormTitle"
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
                        id="xpack.osquery.queryFlyoutForm.versionFieldOptionalLabel"
                        defaultMessage="(optional)"
                      />
                    </EuiText>
                  </EuiFlexItem>
                }
                // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
                euiFieldProps={{
                  noSuggestions: false,
                  singleSelection: { asPlainText: true },
                  placeholder: i18n.translate('xpack.osquery.queriesTable.osqueryVersionAllLabel', {
                    defaultMessage: 'ALL',
                  }),
                  options: ALL_OSQUERY_VERSIONS_OPTIONS,
                  onCreateOption: undefined,
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <CommonUseField path="platform" component={PlatformCheckBoxGroupField} />
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
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.osquery.queryFlyoutForm.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton isLoading={isSubmitting} onClick={submit} fill>
              <FormattedMessage
                id="xpack.osquery.queryFlyoutForm.saveButtonLabel"
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
