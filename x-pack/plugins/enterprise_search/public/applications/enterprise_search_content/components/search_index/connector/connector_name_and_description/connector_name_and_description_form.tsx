/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiTextArea,
} from '@elastic/eui';

import { Status } from '../../../../../../../common/types/api';
import {
  NAME_LABEL,
  DESCRIPTION_LABEL,
  SAVE_BUTTON_LABEL,
  CANCEL_BUTTON_LABEL,
} from '../../../../../shared/constants';
import { ConnectorNameAndDescriptionApiLogic } from '../../../../api/connector/update_connector_name_and_description_api_logic';
import { isConnectorIndex } from '../../../../utils/indices';
import { IndexViewLogic } from '../../index_view_logic';

import { ConnectorNameAndDescriptionLogic } from './connector_name_and_description_logic';

export const ConnectorNameAndDescriptionForm: React.FC = () => {
  const { index } = useValues(IndexViewLogic);
  const { status } = useValues(ConnectorNameAndDescriptionApiLogic);
  const {
    localNameAndDescription: { name, description },
  } = useValues(ConnectorNameAndDescriptionLogic);
  const { saveNameAndDescription, setIsEditing, updateLocalNameAndDescription } = useActions(
    ConnectorNameAndDescriptionLogic
  );

  if (!isConnectorIndex(index)) {
    return <></>;
  }

  return (
    <EuiForm
      onSubmit={(event) => {
        event.preventDefault();
        saveNameAndDescription();
      }}
      component="form"
    >
      <EuiFormRow label={NAME_LABEL}>
        <EuiFieldText
          required
          value={name ?? ''}
          onChange={(event) => {
            updateLocalNameAndDescription({ name: event.target.value });
          }}
        />
      </EuiFormRow>
      <EuiFormRow label={DESCRIPTION_LABEL}>
        <EuiTextArea
          placeholder={'Optional'}
          value={description || ''}
          onChange={(event) => {
            updateLocalNameAndDescription({ description: event.target.value });
          }}
        />
      </EuiFormRow>
      <EuiFormRow>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-telemetry-id="entSearchContent-connector-configuration-nameAndDescription-save"
              type="submit"
              isLoading={status === Status.LOADING}
            >
              {SAVE_BUTTON_LABEL}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-telemetry-id="entSearchContent-connector-configuration-nameAndDescription-cancel"
              isDisabled={status === Status.LOADING}
              onClick={() => {
                setIsEditing(false);
              }}
            >
              {CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiForm>
  );
};
