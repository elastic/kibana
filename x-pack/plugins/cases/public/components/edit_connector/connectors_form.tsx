/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import {
  Form,
  UseField,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useCallback, useMemo } from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { NONE_CONNECTOR_ID } from '../../../common/constants';
import type { CaseConnectors, CaseUI } from '../../../common/ui/types';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import type { CaseActionConnector } from '../types';
import {
  convertEmptyValuesToNull,
  getConnectorById,
  getConnectorsFormDeserializer,
  getConnectorsFormSerializer,
  getConnectorsFormValidators,
} from '../utils';
import { ConnectorSelector } from '../connector_selector/form';
import { getNoneConnector, normalizeActionConnector } from '../configure_cases/utils';
import * as i18n from './translations';
import type { ConnectorTypeFields, CaseConnector } from '../../../common/types/domain';

interface Props {
  caseData: CaseUI;
  caseConnectors: CaseConnectors;
  supportedActionConnectors: CaseActionConnector[];
  isLoading: boolean;
  onSubmit(connector: CaseConnector): void;
  onCancel(): void;
}

interface FormState {
  connectorId: string;
  fields: ConnectorTypeFields['fields'];
}

const ConnectorsFormComponent: React.FC<Props> = ({
  caseData,
  caseConnectors,
  supportedActionConnectors,
  isLoading,
  onSubmit,
  onCancel,
}) => {
  const initialConnectorId = caseData.connector.id;
  const initialConnectorFields = caseData.connector.fields;

  const { form } = useForm<FormState>({
    defaultValue: { connectorId: initialConnectorId, fields: initialConnectorFields },
    options: { stripEmptyFields: false },
    serializer: getConnectorsFormSerializer,
    deserializer: getConnectorsFormDeserializer,
  });

  const [{ connectorId, fields }] = useFormData<FormState>({ form });

  const fieldsWithNullValues = useMemo(() => convertEmptyValuesToNull(fields), [fields]);

  const { submit } = form;

  const currentActionConnector = getConnectorById(connectorId, supportedActionConnectors);

  /**
   *  only enable the save button if changes were made to the previous selected
   * connector or its fields
   * null and none are equivalent to `no connector`.
   * This makes sure we don't enable the button when the "no connector" option is selected
   * by default. e.g. when a case is created without a connector
   */
  const isDefaultNoneConnectorSelected =
    currentActionConnector === null && initialConnectorId === NONE_CONNECTOR_ID;

  const enableSave =
    (!isDefaultNoneConnectorSelected && currentActionConnector?.id !== initialConnectorId) ||
    !deepEqual(fieldsWithNullValues, initialConnectorFields);

  const onConnectorChange = (newConnectorId: string) => {
    const newFields = caseConnectors[newConnectorId]?.fields;

    form.reset({
      resetValues: true,
      defaultValue: { connectorId: newConnectorId, fields: newFields },
    });
  };

  const connectorIdConfig = getConnectorsFormValidators({
    config: {},
    connectors: supportedActionConnectors,
  });

  const onSubmitConnector = useCallback(async () => {
    const { isValid, data: newData } = await submit();
    if (isValid && newData.connectorId) {
      const connector = getConnectorById(newData.connectorId, supportedActionConnectors);

      const connectorToUpdate = connector
        ? normalizeActionConnector(connector)
        : getNoneConnector();

      const connectorWithFields = {
        ...connectorToUpdate,
        fields: newData.fields ?? null,
      } as CaseConnector;

      onSubmit(connectorWithFields);
    }
  }, [onSubmit, submit, supportedActionConnectors]);

  return (
    <Form form={form}>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" direction="row">
            <EuiFlexItem>
              <UseField
                path="connectorId"
                config={connectorIdConfig}
                component={ConnectorSelector}
                componentProps={{
                  connectors: supportedActionConnectors,
                  dataTestSubj: 'caseConnectors',
                  defaultValue: initialConnectorId,
                  idAria: 'caseConnectors',
                  isLoading,
                  handleChange: onConnectorChange,
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="edit-connector-fields-form-flex-item">
          <ConnectorFieldsForm connector={currentActionConnector} key={connectorId} />
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                disabled={!enableSave}
                color="success"
                data-test-subj="edit-connectors-submit"
                fill
                iconType="save"
                onClick={onSubmitConnector}
                size="s"
              >
                {i18n.SAVE}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="edit-connectors-cancel"
                iconType="cross"
                onClick={onCancel}
                size="s"
              >
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Form>
  );
};

ConnectorsFormComponent.displayName = 'ConnectorsForm';

export const ConnectorsForm = React.memo(ConnectorsFormComponent);
