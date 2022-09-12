/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';

import { NativeConnector } from '../types';

interface ConnectorNameAndDescriptionProps {
  nativeConnector: NativeConnector;
}

export const ConnectorNameAndDescription: React.FC<ConnectorNameAndDescriptionProps> = ({
  nativeConnector,
}) => {
  const { name } = nativeConnector;
  return (
    <EuiForm component="form">
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText size="s">
            By naming and describing this connector your colleagues and wider team will know what
            this connector is meant for.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Name">
            <EuiFieldText placeholder={`${name} connector`} disabled />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Description">
            <EuiTextArea placeholder={'Optional'} disabled />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiButton disabled type="submit">
                Save name and description
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
