/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../../common/types/api';
import { ConnectorConfigurationApiLogic } from '../../../api/connector_package/update_connector_configuration_api_logic';
import { ConnectorConfiguration } from '../../../api/index/fetch_index_api_logic';

import { isNotNullish } from '../../../utils/is_not_nullish';

import { ConnectorConfigurationLogic } from './connector_configuration_logic';

interface ConnectorConfigurationConfigArgs {
  configuration: ConnectorConfiguration;
  indexId: string;
  indexName: string;
}

export const ConnectorConfigurationConfig: React.FC<ConnectorConfigurationConfigArgs> = ({
  configuration,
  indexId,
  indexName,
}) => {
  const configLogic = ConnectorConfigurationLogic({ configuration });
  const { makeRequest } = useActions(ConnectorConfigurationApiLogic);
  const { status } = useValues(ConnectorConfigurationApiLogic);
  const { configState, isEditing } = useValues(configLogic);
  const { setIsEditing } = useActions(configLogic);
  // The config state used when in editing mode
  const [editingConfigState, setEditingConfigState] = useState(configuration);
  useEffect(() => {
    if (isEditing) {
      setEditingConfigState(configState);
    }
  }, [isEditing]);

  const form = (
    <EuiForm
      onSubmit={(event) => {
        event.preventDefault();
        makeRequest({
          configuration: editingConfigState,
          indexId,
          indexName,
        });
      }}
      component="form"
    >
      {Object.keys(configuration).map((key) => (
        <EuiFormRow label={configuration[key]?.label ?? ''}>
          <EuiFieldText
            value={editingConfigState[key]?.value}
            disabled={status === Status.LOADING}
            onChange={(event) => {
              const result = editingConfigState[key]
                ? {
                    ...editingConfigState,
                    [key]: {
                      ...editingConfigState[key],
                      label: editingConfigState[key]?.label ?? '',
                      value: event.target.value ?? '',
                    },
                  }
                : editingConfigState;
              setEditingConfigState(result);
            }}
          />
        </EuiFormRow>
      ))}
      <EuiFormRow>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton type="submit" isLoading={status === Status.LOADING}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.config.submitButton.title',
                {
                  defaultMessage: 'Save configuration',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isDisabled={status === Status.LOADING}
              onClick={() => {
                setIsEditing(false);
              }}
            >
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.config.cancelEditingButton.title',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiForm>
  );

  const displayList = Object.values(configState)
    .filter(isNotNullish)
    .map(({ label, value }) => ({ description: value ?? '--', title: label }));
  const display = (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiDescriptionList listItems={displayList} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={() => setIsEditing(!isEditing)}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.indices.configurationConnector.config.editButton.title',
                {
                  defaultMessage: 'Edit configuration',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const fields = isEditing ? form : display;
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiText size="s">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.configurationConnector.config.description',
            {
              defaultMessage:
                'Once done return to Enterprise Search and point to your connector instance using the authentication method of your choice.',
            }
          )}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>{displayList.length > 0 && fields}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
