/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import React, { useCallback, useReducer } from 'react';
import deepEqual from 'fast-deep-equal';
import {
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiButtonIcon,
} from '@elastic/eui';
import styled from 'styled-components';
import { isEmpty, noop } from 'lodash/fp';

import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, UseField, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { Case, CaseConnectors } from '../../../common/ui/types';
import type { ActionConnector, ConnectorTypeFields } from '../../../common/api';
import { NONE_CONNECTOR_ID } from '../../../common/api';
import { ConnectorSelector } from '../connector_selector/form';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { schema } from './schema';
import * as i18n from './translations';
import { getConnectorById, getConnectorsFormValidators } from '../utils';
import { usePushToService } from '../use_push_to_service';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import { useCasesContext } from '../cases_context/use_cases_context';

export interface EditConnectorProps {
  caseData: Case;
  caseConnectors: CaseConnectors;
  connectorName: string;
  allAvailableConnectors: ActionConnector[];
  isLoading: boolean;
  isValidConnector: boolean;
  onSubmit: (
    connectorId: string,
    connectorFields: ConnectorTypeFields['fields'],
    onError: () => void,
    onSuccess: () => void
  ) => void;
}

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => `
    p {
      font-size: ${theme.eui.euiSizeM};
    }
  `}
`;
const DisappearingFlexItem = styled(EuiFlexItem)`
  ${({ $isHidden }: { $isHidden: boolean }) =>
    $isHidden &&
    `
      margin: 0 !important;
      & .euiFlexItem {
        margin: 0 !important;
      }
    `}
`;

interface State {
  currentConnector: ActionConnector | null;
  fields: ConnectorTypeFields['fields'];
  editConnector: boolean;
}

type Action =
  | { type: 'SET_CURRENT_CONNECTOR'; payload: State['currentConnector'] }
  | { type: 'SET_FIELDS'; payload: State['fields'] }
  | { type: 'SET_EDIT_CONNECTOR'; payload: State['editConnector'] };

const editConnectorReducer = (state: State, action: Action) => {
  switch (action.type) {
    case 'SET_CURRENT_CONNECTOR':
      return {
        ...state,
        currentConnector: action.payload,
      };
    case 'SET_FIELDS':
      return {
        ...state,
        fields: action.payload,
      };
    case 'SET_EDIT_CONNECTOR':
      return {
        ...state,
        editConnector: action.payload,
      };
    default:
      return state;
  }
};

const initialState = {
  currentConnector: null,
  fields: null,
  editConnector: false,
};

export const EditConnector = React.memo(
  ({
    caseData,
    caseConnectors,
    connectorName,
    allAvailableConnectors,
    isLoading,
    isValidConnector,
    onSubmit,
  }: EditConnectorProps) => {
    const { permissions } = useCasesContext();
    const caseFields = caseData.connector.fields;
    const selectedConnector = caseData.connector.id;

    const { form } = useForm({
      defaultValue: { connectorId: selectedConnector },
      options: { stripEmptyFields: false },
      schema,
    });
    const { actions } = useApplicationCapabilities();
    const actionsReadCapabilities = actions.read;

    const { setFieldValue, submit } = form;

    const [{ currentConnector, fields, editConnector }, dispatch] = useReducer(
      editConnectorReducer,
      {
        ...initialState,
        fields: caseFields,
        currentConnector: getConnectorById(caseData.connector.id, allAvailableConnectors),
      }
    );

    // only enable the save button if changes were made to the previous selected
    // connector or its fields
    // null and none are equivalent to `no connector`.
    // This makes sure we don't enable the button when the "no connector" option is selected
    // by default. e.g. when a case is created without a selector
    const isNoConnectorDefaultValue =
      currentConnector === null && selectedConnector === NONE_CONNECTOR_ID;

    const enableSave =
      (!isNoConnectorDefaultValue && currentConnector?.id !== selectedConnector) ||
      !deepEqual(fields, caseFields);

    const onChangeConnector = useCallback(
      (newConnectorId) => {
        // change connector on dropdown action
        if (currentConnector?.id !== newConnectorId) {
          dispatch({
            type: 'SET_CURRENT_CONNECTOR',
            payload: getConnectorById(newConnectorId, allAvailableConnectors),
          });
          dispatch({
            type: 'SET_FIELDS',
            payload: caseConnectors[newConnectorId]?.fields ?? null,
          });
        }
      },
      [currentConnector, caseConnectors, allAvailableConnectors]
    );

    const onFieldsChange = useCallback(
      (newFields) => {
        if (!deepEqual(newFields, fields)) {
          dispatch({
            type: 'SET_FIELDS',
            payload: newFields,
          });
        }
      },
      [fields, dispatch]
    );

    const onError = useCallback(() => {
      setFieldValue('connectorId', selectedConnector);
      dispatch({
        type: 'SET_EDIT_CONNECTOR',
        payload: false,
      });
    }, [dispatch, setFieldValue, selectedConnector]);

    const onCancelConnector = useCallback(() => {
      setFieldValue('connectorId', selectedConnector);
      dispatch({
        type: 'SET_FIELDS',
        payload: caseFields,
      });
      dispatch({
        type: 'SET_EDIT_CONNECTOR',
        payload: false,
      });
    }, [dispatch, selectedConnector, setFieldValue, caseFields]);

    const onSubmitConnector = useCallback(async () => {
      const { isValid, data: newData } = await submit();
      if (isValid && newData.connectorId) {
        onSubmit(newData.connectorId, fields, onError, noop);
        dispatch({
          type: 'SET_EDIT_CONNECTOR',
          payload: false,
        });
      }
    }, [dispatch, submit, fields, onSubmit, onError]);

    const onEditClick = useCallback(() => {
      dispatch({
        type: 'SET_EDIT_CONNECTOR',
        payload: true,
      });
    }, [dispatch]);

    const connectorIdConfig = getConnectorsFormValidators({
      config: schema.connectorId as FieldConfig,
      connectors: allAvailableConnectors,
    });

    const { pushButton, pushCallouts } = usePushToService({
      connector: {
        ...caseData.connector,
        name: isEmpty(connectorName) ? caseData.connector.name : connectorName,
      },
      caseConnectors,
      caseId: caseData.id,
      caseStatus: caseData.status,
      allAvailableConnectors,
      onEditClick,
      isValidConnector,
    });

    return (
      <EuiFlexItem grow={false}>
        <EuiText>
          <MyFlexGroup
            alignItems="center"
            gutterSize="xs"
            justifyContent="spaceBetween"
            responsive={false}
            data-test-subj="case-view-edit-connector"
          >
            <EuiFlexItem grow={false} data-test-subj="connector-edit-header">
              <h4>{i18n.CONNECTORS}</h4>
            </EuiFlexItem>
            {isLoading && <EuiLoadingSpinner data-test-subj="connector-loading" />}
            {!isLoading && !editConnector && permissions.push && actionsReadCapabilities && (
              <EuiFlexItem data-test-subj="connector-edit" grow={false}>
                <EuiButtonIcon
                  data-test-subj="connector-edit-button"
                  aria-label={i18n.EDIT_CONNECTOR_ARIA}
                  iconType={'pencil'}
                  onClick={onEditClick}
                />
              </EuiFlexItem>
            )}
          </MyFlexGroup>
          <EuiHorizontalRule margin="xs" />
          <MyFlexGroup data-test-subj="edit-allAvailableConnectors" direction="column">
            {!isLoading && !editConnector && pushCallouts && actionsReadCapabilities && (
              <EuiFlexItem data-test-subj="push-callouts">{pushCallouts}</EuiFlexItem>
            )}
            <DisappearingFlexItem $isHidden={!editConnector}>
              <Form form={form}>
                <EuiFlexGroup gutterSize="none" direction="row">
                  <EuiFlexItem>
                    <UseField
                      path="connectorId"
                      config={connectorIdConfig}
                      component={ConnectorSelector}
                      componentProps={{
                        connectors: allAvailableConnectors,
                        dataTestSubj: 'caseConnectors',
                        defaultValue: selectedConnector,
                        disabled: !permissions.push,
                        idAria: 'caseConnectors',
                        isEdit: editConnector,
                        isLoading,
                      }}
                      onChange={onChangeConnector}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </Form>
            </DisappearingFlexItem>
            <EuiFlexItem data-test-subj="edit-connector-fields-form-flex-item">
              {!editConnector && !actionsReadCapabilities && (
                <EuiText data-test-subj="edit-connector-permissions-error-msg" size="s">
                  <span>{i18n.READ_ACTIONS_PERMISSIONS_ERROR_MSG}</span>
                </EuiText>
              )}
              <ConnectorFieldsForm
                connector={currentConnector}
                fields={fields}
                isEdit={editConnector}
                onChange={onFieldsChange}
              />
            </EuiFlexItem>
            {editConnector && (
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      disabled={!enableSave}
                      color="success"
                      data-test-subj="edit-allAvailableConnectors-submit"
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
                      data-test-subj="edit-allAvailableConnectors-cancel"
                      iconType="cross"
                      onClick={onCancelConnector}
                      size="s"
                    >
                      {i18n.CANCEL}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
            {pushCallouts == null &&
              !isLoading &&
              !editConnector &&
              permissions.push &&
              actionsReadCapabilities && (
                <EuiFlexItem data-test-subj="has-data-to-push-button" grow={false}>
                  <span>{pushButton}</span>
                </EuiFlexItem>
              )}
          </MyFlexGroup>
        </EuiText>
      </EuiFlexItem>
    );
  }
);

EditConnector.displayName = 'EditConnector';
