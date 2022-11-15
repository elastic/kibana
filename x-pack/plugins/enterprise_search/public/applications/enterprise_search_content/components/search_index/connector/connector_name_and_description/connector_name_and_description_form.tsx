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
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
} from '@elastic/eui';

import { Status } from '../../../../../../../common/types/api';
import { SAVE_BUTTON_LABEL, CANCEL_BUTTON_LABEL } from '../../../../../shared/constants';
import { ConnectorNameAndDescriptionApiLogic } from '../../../../api/connector/update_connector_name_and_description_api_logic';

import { ConnectorNameAndDescriptionFormContent } from './connector_name_and_description_form_content';
import { ConnectorNameAndDescriptionLogic } from './connector_name_and_description_logic';

export const ConnectorNameAndDescriptionForm: React.FC = () => {
  const { status } = useValues(ConnectorNameAndDescriptionApiLogic);

  const { saveNameAndDescription, setIsEditing } = useActions(ConnectorNameAndDescriptionLogic);

  return (
    <EuiForm
      onSubmit={(event) => {
        event.preventDefault();
        saveNameAndDescription();
      }}
      component="form"
    >
      <ConnectorNameAndDescriptionFormContent />
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
