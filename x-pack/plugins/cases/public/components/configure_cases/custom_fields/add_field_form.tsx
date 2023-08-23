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
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
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
  // caseData: CaseUI;
  // caseConnectors: CaseConnectors;
  // supportedActionConnectors: CaseActionConnector[];
  isLoading: boolean;
  onSubmit(connector: CaseConnector): void;
  onCancel(): void;
}

interface FormState {
}

enum customFieldTypesEnum {
  STRING = 'string',
  URL = 'url',
  LIST = 'list',
  BOOLEAN = 'boolean',
}



const AddFieldFormComponent: React.FC<Props> = ({
  isLoading,
  onSubmit,
  onCancel,
}) => {
  const { form } = useForm<FormState>({
    // defaultValue: { connectorId: initialConnectorId, fields: initialConnectorFields },
    options: { stripEmptyFields: false },
    // serializer: getConnectorsFormSerializer,
    // deserializer: getConnectorsFormDeserializer,
  });

  // const [{ connectorId, fields }] = useFormData<FormState>({ form });

  // const fieldsWithNullValues = useMemo(() => convertEmptyValuesToNull(fields), [fields]);

  const { submit } = form;

  const customFieldTypes: customFieldTypesEnum[] = [
    customFieldTypesEnum.STRING,
    customFieldTypesEnum.LIST,
    customFieldTypesEnum.BOOLEAN,
    customFieldTypesEnum.URL
  ]


  // const connectorIdConfig = getConnectorsFormValidators({
  //   config: {},
  //   connectors: supportedActionConnectors,
  // });

  // const onSubmitConnector = useCallback(async () => {
  //   const { isValid, data: newData } = await submit();
  //   if (isValid && newData.connectorId) {
  //     const connector = getConnectorById(newData.connectorId, supportedActionConnectors);

  //     const connectorToUpdate = connector
  //       ? normalizeActionConnector(connector)
  //       : getNoneConnector();

  //     const connectorWithFields = {
  //       ...connectorToUpdate,
  //       fields: newData.fields ?? null,
  //     } as CaseConnector;

  //     onSubmit(connectorWithFields);
  //   }
  // }, [onSubmit, submit, supportedActionConnectors]);

const onFieldTypeChange = () => {
  console.log('Field Type Changed');
}

  return (
    <Form form={form}>
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" direction="row">
            <EuiFlexItem>
              <UseField
                path="connectorId"
                config={{}}
                component={FieldTypeSelector}
                componentProps={{
                  customFieldTypes: customFieldTypes,
                  dataTestSubj: 'addCustomField',
                  defaultValue: customFieldTypes[0],
                  idAria: 'addCustomField',
                  isLoading,
                  handleChange: onFieldTypeChange,
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {/* <EuiFlexItem data-test-subj="edit-connector-fields-form-flex-item">
          <ConnectorFieldsForm connector={currentActionConnector} key={connectorId} />
        </EuiFlexItem> */}
        {/* <EuiFlexItem>
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
          </EuiFlexGroup> */}
        {/* </EuiFlexItem> */}
      </EuiFlexGroup>
    </Form>
  );
};

AddFieldFormComponent.displayName = 'AddFieldForm';

export const AddFieldForm = React.memo(AddFieldFormComponent);







{/* <EuiFlexGroup direction='column'>
          <EuiFlexItem>
            <EuiText>
              <h4>{i18n.FIELD_LABEL}</h4>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup> */}