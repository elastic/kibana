/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
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
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

import { PackagePolicyInputStream } from '../../../../fleet/common';
import { CodeEditorField } from '../../queries/form/code_editor_field';
import { Form, useForm, getUseField, Field, FIELD_TYPES } from '../../shared_imports';
import { idFieldValidations, intervalFieldValidation, queryFieldValidation } from './validations';
import { PlatformCheckBoxGroupField } from './platform_checkbox_group_field';
import { ALL_OSQUERY_VERSIONS_OPTIONS } from './constants';

const FORM_ID = 'editQueryFlyoutForm';

const CommonUseField = getUseField({ component: Field });

interface EditQueryFlyoutProps {
  defaultValue: PackagePolicyInputStream;
  onSave: (payload: FormData) => void;
  onClose: () => void;
}

export const EditQueryFlyout: React.FC<EditQueryFlyoutProps> = ({
  defaultValue,
  onSave,
  onClose,
}) => {
  const { form } = useForm({
    id: FORM_ID,
    // @ts-expect-error update types
    onSubmit: (payload, isValid) => {
      if (isValid) {
        // @ts-expect-error update types
        onSave(payload);
        onClose();
      }
      return;
    },
    defaultValue,
    deserializer: (payload) => ({
      id: payload.vars.id.value,
      query: payload.vars.query.value,
      interval: payload.vars.interval.value,
      platform: payload.vars.platform?.value,
      version: payload.vars.version?.value ? [payload.vars.version?.value] : [],
    }),
    schema: {
      id: {
        type: FIELD_TYPES.TEXT,
        label: i18n.translate('xpack.osquery.scheduledQueryGroup.queryFlyoutForm.idFieldLabel', {
          defaultMessage: 'ID',
        }),
        validations: idFieldValidations.map((validator) => ({ validator })),
      },
      query: {
        type: FIELD_TYPES.TEXT,
        label: i18n.translate('xpack.osquery.scheduledQueryGroup.queryFlyoutForm.queryFieldLabel', {
          defaultMessage: 'Query',
        }),
        validations: [{ validator: queryFieldValidation }],
      },
      interval: {
        type: FIELD_TYPES.NUMBER,
        label: i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.intervalFieldLabel',
          {
            defaultMessage: 'Interval (s)',
          }
        ),
        validations: [{ validator: intervalFieldValidation }],
      },
      platform: {
        type: FIELD_TYPES.TEXT,
        label: i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.platformFieldLabel',
          {
            defaultMessage: 'Platform',
          }
        ),
        validations: [],
      },
      version: {
        type: FIELD_TYPES.COMBO_BOX,
        label: i18n.translate(
          'xpack.osquery.scheduledQueryGroup.queryFlyoutForm.versionFieldLabel',
          {
            defaultMessage: 'Minimum Osquery version',
          }
        ),

        validations: [],
      },
    },
  });

  const { submit } = form;

  return (
    <EuiPortal>
      <EuiFlyout size="m" ownFocus onClose={onClose} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="flyoutTitle">
              <FormattedMessage
                id="xpack.osquery.scheduleQueryGroup.queryFlyoutForm.editFormTitle"
                defaultMessage="Edit query"
              />
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
                    noSuggestions: false,
                    singleSelection: { asPlainText: true },
                    placeholder: ALL_OSQUERY_VERSIONS_OPTIONS[0].label,
                    options: ALL_OSQUERY_VERSIONS_OPTIONS,
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <CommonUseField path="platform" component={PlatformCheckBoxGroupField} />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
          </Form>
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
