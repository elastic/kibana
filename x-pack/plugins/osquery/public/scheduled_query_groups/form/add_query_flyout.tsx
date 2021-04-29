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

import { CodeEditorField } from '../../queries/form/code_editor_field';
import { idFieldValidations, intervalFieldValidation, queryFieldValidation } from './validations';
import { Form, useForm, FormData, getUseField, Field, FIELD_TYPES } from '../../shared_imports';

const FORM_ID = 'addQueryFlyoutForm';

const CommonUseField = getUseField({ component: Field });

interface AddQueryFlyoutProps {
  onSave: (payload: FormData) => Promise<void>;
  onClose: () => void;
}

const AddQueryFlyoutComponent: React.FC<AddQueryFlyoutProps> = ({ onSave, onClose }) => {
  const { form } = useForm({
    id: FORM_ID,
    // @ts-expect-error update types
    onSubmit: (payload, isValid) => {
      if (isValid) {
        onSave(payload);
        onClose();
      }
    },
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
    },
  });

  const { submit } = form;

  return (
    <EuiPortal>
      <EuiFlyout size="s" ownFocus onClose={onClose} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="flyoutTitle">
              <FormattedMessage
                id="xpack.osquery.scheduleQueryGroup.queryFlyoutForm.addFormTitle"
                defaultMessage="Attach next query"
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
            {
              // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
              <CommonUseField path="interval" euiFieldProps={{ append: 's' }} />
            }
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

export const AddQueryFlyout = React.memo(AddQueryFlyoutComponent);
