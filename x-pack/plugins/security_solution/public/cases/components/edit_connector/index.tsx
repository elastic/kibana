/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

import { Form, UseField, useForm } from '../../../shared_imports';
import { ConnectorTypeFields } from '../../../../../case/common/api/connectors';
import { ConnectorSelector } from '../connector_selector/form';
import { ActionConnector } from '../../../../../case/common/api/cases';
import { SettingFieldsForm } from '../settings/fields_form';
import { getConnectorById } from '../configure_cases/utils';
import { CaseUserActions } from '../../containers/types';
import { schema } from './schema';
import { getConnectorFieldsFromUserActions } from './helpers';
import * as i18n from './translations';

interface EditConnectorProps {
  caseFields: ConnectorTypeFields['fields'];
  connectors: ActionConnector[];
  disabled?: boolean;
  isLoading: boolean;
  onSubmit: (
    connectorId: string,
    connectorFields: ConnectorTypeFields['fields'],
    onError: () => void,
    onSuccess: () => void
  ) => void;
  selectedConnector: string;
  userActions: CaseUserActions[];
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
    disabled = false,
    isLoading,
    onSubmit,
    selectedConnector,
    userActions,
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
    return (
      <EuiText>
        <MyFlexGroup alignItems="center" gutterSize="xs" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <h4>{i18n.CONNECTORS}</h4>
          </EuiFlexItem>
          {isLoading && <EuiLoadingSpinner data-test-subj="connector-loading" />}
          {!isLoading && !editConnector && (
            <EuiFlexItem data-test-subj="connector-edit" grow={false}>
              <EuiButtonIcon
                data-test-subj="connector-edit-button"
                isDisabled={disabled}
                aria-label={i18n.EDIT_CONNECTOR_ARIA}
                iconType={'pencil'}
                onClick={onEditClick}
              />
            </EuiFlexItem>
          )}
        </MyFlexGroup>
        <EuiHorizontalRule margin="xs" />
        <MyFlexGroup gutterSize="none">
          <EuiFlexGroup data-test-subj="edit-connectors" direction="column">
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
                        disabled,
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
            <EuiFlexItem data-test-subj="edit-connector-settings-fields-form-flex-item">
              {(currentConnector == null || currentConnector?.id === 'none') && // Connector is none or not defined.
                !(currentConnector === null && selectedConnector !== 'none') && // Connector has not been deleted.
                !editConnector && (
                  <EuiText size="s">
                    <span>{i18n.NO_CONNECTOR}</span>
                  </EuiText>
                )}
              <SettingFieldsForm
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
          </EuiFlexGroup>
        </MyFlexGroup>
      </EuiText>
    );
  }
);

EditConnector.displayName = 'EditConnector';
