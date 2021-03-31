/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/jsx-no-bind */

/* eslint-disable react-perf/jsx-no-new-function-as-prop */

import { produce } from 'immer';
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
  EuiLink,
} from '@elastic/eui';
import React from 'react';

import { CodeEditorField } from '../../queries/form/code_editor_field';

import {
  UseField,
  Form,
  useForm,
  getUseField,
  Field,
  FIELD_TYPES,
  useFormData,
} from '../../shared_imports';

const FORM_ID = 'addQueryFlyoutForm';

const CommonUseField = getUseField({ component: Field });

export const AddQueryFlyout = ({ onSave, onClose }) => {
  const { form } = useForm({
    id: FORM_ID,
    onSubmit: (payload, isValid) => {
      console.error('aaa', payload);
      if (isValid) {
        onSave(payload);
        onClose();
      }
    },
    schema: {
      id: {
        type: FIELD_TYPES.TEXT,
        label: 'ID',
      },
      query: {
        type: FIELD_TYPES.TEXT,
        label: 'Query',
        helpText: (
          <EuiLink href="https://osquery.io/schema/4.7.0" target="_blank">
            {'Osquery schema'}
          </EuiLink>
        ),
      },
      interval: {
        type: FIELD_TYPES.NUMBER,
        label: 'Interval',
      },
    },
  });

  const { submit } = form;

  return (
    <EuiPortal>
      <EuiFlyout size="s" ownFocus onClose={onClose} aria-labelledby="flyoutTitle">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id="flyoutTitle">Attach next query</h2>
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
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={submit} fill>
                Save
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
};
