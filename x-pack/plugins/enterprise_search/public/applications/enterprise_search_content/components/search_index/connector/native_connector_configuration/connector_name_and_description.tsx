/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

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

import { i18n } from '@kbn/i18n';

import { isConnectorIndex } from '../../../../utils/indices';
import { IndexViewLogic } from '../../index_view_logic';
import { NativeConnector } from '../types';

interface ConnectorNameAndDescriptionProps {
  nativeConnector: NativeConnector;
}

export const ConnectorNameAndDescription: React.FC<ConnectorNameAndDescriptionProps> = ({
  nativeConnector,
}) => {
  const { index: indexData } = useValues(IndexViewLogic);
  const { name } = nativeConnector;
  return (
    <EuiForm component="form">
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText size="s">
            {i18n.translate(
              'xpack.enterpriseSearch.content.indices.configurationConnector.nameAndDescriptionForm.description',
              {
                defaultMessage:
                  'By naming and describing this connector your colleagues and wider team will know what this connector is meant for.',
              }
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Name">
            <EuiFieldText
              value={isConnectorIndex(indexData) ? indexData.connector.name : ''}
              placeholder={`${name} connector`}
              disabled
            />
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
                {i18n.translate(
                  'xpack.enterpriseSearch.content.indices.configurationConnector.nameAndDescriptionForm.submitButtonLabel',
                  {
                    defaultMessage: 'Save name and description',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
