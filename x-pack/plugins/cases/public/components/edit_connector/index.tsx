/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { noop } from 'lodash/fp';

import { Form, UseField, useForm } from '../../common/shared_imports';
import { ActionConnector, ConnectorTypeFields } from '../../../common';
import { ConnectorSelector } from '../connector_selector/form';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { getConnectorById } from '../configure_cases/utils';
import { CaseUserActions } from '../../containers/types';
import { schema } from './schema';
import { getConnectorFieldsFromUserActions } from './helpers';
import * as i18n from './translations';

export interface EditConnectorProps {
  caseFields: ConnectorTypeFields['fields'];
  connectors: ActionConnector[];
  isLoading: boolean;
  onSubmit: (
    connectorId: string,
    connectorFields: ConnectorTypeFields['fields'],
    onError: () => void,
    onSuccess: () => void
  ) => void;
  selectedConnector: string;
  userActions: CaseUserActions[];
  userCanCrud?: boolean;
  hideConnectorServiceNowSir?: boolean;
  permissionsError?: string;
}

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => `
    margin-top: ${theme.eui.euiSizeM};
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
    caseFields,
    connectors,
    userCanCrud = true,
    hideConnectorServiceNowSir = false,
    isLoading,
    onSubmit,
    selectedConnector,
    userActions,
    permissionsError,
  }: EditConnectorProps) => {
    const { form } = useForm({
      defaultValue: { connectorId: selectedConnector },
      options: { stripEmptyFields: false },
      schema,
    });

    const { setFieldValue, submit } = form;

    const [{ currentConnector, fields, editConnector }, dispatch] = useReducer(
      editConnectorReducer,
      { ...initialState, fields: caseFields }
    );

    const onChangeConnector = useCallback(
      (newConnectorId) => {
        // Init
        if (currentConnector == null) {
          dispatch({
            type: 'SET_CURRENT_CONNECTOR',
            payload: getConnectorById(newConnectorId, connectors),
          });
        }
        // change connect on dropdown action
        else if (currentConnector.id !== newConnectorId) {
          dispatch({
            type: 'SET_CURRENT_CONNECTOR',
            payload: getConnectorById(newConnectorId, connectors),
          });
          dispatch({
            type: 'SET_FIELDS',
            payload: getConnectorFieldsFromUserActions(newConnectorId, userActions ?? []),
          });
        } else if (fields === null) {
          dispatch({
            type: 'SET_FIELDS',
            payload: getConnectorFieldsFromUserActions(newConnectorId, userActions ?? []),
          });
        }
      },
      [currentConnector, fields, userActions, connectors]
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

    /**
     * if this evaluates to true it means that the connector was likely deleted because the case connector was set to something
     * other than none but we don't find it in the list of connectors returned from the actions plugin
     */
    const connectorFromCaseMissing = currentConnector == null && selectedConnector !== 'none';

    /**
     * True if the chosen connector from the form was the "none" connector or no connector was in the case. The
     * currentConnector will be null initially and after the form initializes if the case connector is "none"
     */
    const connectorUndefinedOrNone = currentConnector == null || currentConnector?.id === 'none';

    return (
      <EuiText>
        <MyFlexGroup alignItems="center" gutterSize="xs" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <h4>{i18n.CONNECTORS}</h4>
          </EuiFlexItem>
          {isLoading && <EuiLoadingSpinner data-test-subj="connector-loading" />}
          {!isLoading && !editConnector && userCanCrud && (
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
        <MyFlexGroup data-test-subj="edit-connectors" direction="column">
          <DisappearingFlexItem $isHidden={!editConnector}>
            <Form form={form}>
              <EuiFlexGroup gutterSize="none" direction="row">
                <EuiFlexItem>
                  <UseField
                    path="connectorId"
                    component={ConnectorSelector}
                    componentProps={{
                      connectors,
                      dataTestSubj: 'caseConnectors',
                      defaultValue: selectedConnector,
                      disabled: !userCanCrud,
                      hideConnectorServiceNowSir,
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
            {!editConnector && permissionsError ? (
              <EuiText data-test-subj="edit-connector-permissions-error-msg" size="s">
                <span>{permissionsError}</span>
              </EuiText>
            ) : (
              // if we're not editing the connectors and the connector specified in the case was found and the connector
              // is undefined or explicitly set to none
              !editConnector &&
              !connectorFromCaseMissing &&
              connectorUndefinedOrNone && (
                <EuiText data-test-subj="edit-connector-no-connectors-msg" size="s">
                  <span>{i18n.NO_CONNECTOR}</span>
                </EuiText>
              )
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
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    color="secondary"
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
                    onClick={onCancelConnector}
                    size="s"
                  >
                    {i18n.CANCEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </MyFlexGroup>
      </EuiText>
    );
  }
);

EditConnector.displayName = 'EditConnector';
