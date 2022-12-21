/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useReducer, useState } from 'react';
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

import { FieldConfig, Form, UseField, useForm } from '../../common/shared_imports';
import { Case } from '../../../common/ui/types';
import { ActionConnector, ConnectorTypeFields, NONE_CONNECTOR_ID } from '../../../common/api';
import { ConnectorSelector } from '../connector_selector/form';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { CaseUserActions } from '../../containers/types';
import { schema } from './schema';
import { getConnectorFieldsFromUserActions } from './helpers';
import * as i18n from './translations';
import { getConnectorById, getConnectorsFormValidators } from '../utils';
import { usePushToService } from '../use_push_to_service';
import { CaseServices } from '../../containers/use_get_case_user_actions';

export interface EditConnectorProps {
  caseData: Case;
  caseServices: CaseServices;
  connectorName: string;
  connectors: ActionConnector[];
  hasDataToPush: boolean;
  isLoading: boolean;
  isValidConnector: boolean;
  onSubmit: (
    connectorId: string,
    connectorFields: ConnectorTypeFields['fields'],
    onError: () => void,
    onSuccess: () => void
  ) => void;
  permissionsError?: string;
  updateCase: (newCase: Case) => void;
  userActions: CaseUserActions[];
  userCanCrud?: boolean;
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
    caseServices,
    connectorName,
    connectors,
    hasDataToPush,
    isLoading,
    isValidConnector,
    onSubmit,
    permissionsError,
    updateCase,
    userActions,
    userCanCrud = true,
  }: EditConnectorProps) => {
    const caseFields = caseData.connector.fields;
    const selectedConnector = caseData.connector.id;
    const { form } = useForm({
      defaultValue: { connectorId: selectedConnector },
      options: { stripEmptyFields: false },
      schema,
    });

    // by default save if disabled
    const [enableSave, setEnableSave] = useState(false);

    const { setFieldValue, submit } = form;

    const [{ currentConnector, fields, editConnector }, dispatch] = useReducer(
      editConnectorReducer,
      { ...initialState, fields: caseFields }
    );

    // only enable the save button if changes were made to the previous selected
    // connector or its fields
    useEffect(() => {
      // null and none are equivalent to `no connector`.
      // This makes sure we don't enable the button when the "no connector" option is selected
      // by default. e.g. when a case is created without a selector
      const isNoConnectorDeafultValue =
        currentConnector === null && selectedConnector === NONE_CONNECTOR_ID;
      const enable =
        (!isNoConnectorDeafultValue && currentConnector?.id !== selectedConnector) ||
        !deepEqual(fields, caseFields);

      setEnableSave(enable);
    }, [caseFields, currentConnector, fields, selectedConnector]);

    useEffect(() => {
      // Initialize the current connector with the connector information attached to the case if we can find that
      // connector in the retrieved connectors from the API call
      if (!isLoading) {
        dispatch({
          type: 'SET_CURRENT_CONNECTOR',
          payload: getConnectorById(caseData.connector.id, connectors),
        });

        // Set the fields initially to whatever is present in the case, this should match with
        // the latest user action for an update connector as well
        dispatch({
          type: 'SET_FIELDS',
          payload: caseFields,
        });
      }
    }, [caseData.connector.id, connectors, isLoading, caseFields]);

    /**
     * There is a race condition with this callback. At some point during the initial mounting of this component, this
     * callback will be called. There are a couple problems with this:
     *
     * 1. If the call occurs before the above useEffect does its dispatches (aka while the connectors are still loading) this will
     *  result in setting the current connector to null when in fact we might have a valid connector. It could also
     *  cause issues when setting the fields because if there are no user actions then the getConnectorFieldsFromUserActions
     *  will return null even when the caseData.connector.fields is valid and populated.
     *
     * 2. If the call occurs after the above useEffect then the currentConnector should === newConnectorId
     *
     * As far as I know dispatch is synchronous so if the useEffect runs first it should successfully set currentConnector. If
     * onChangeConnector runs first and sets stuff to null, then when useEffect runs it'll switch everything back to what we need it to be
     * initially.
     */
    const onChangeConnector = useCallback(
      (newConnectorId) => {
        // change connector on dropdown action
        if (currentConnector?.id !== newConnectorId) {
          dispatch({
            type: 'SET_CURRENT_CONNECTOR',
            payload: getConnectorById(newConnectorId, connectors),
          });
          dispatch({
            type: 'SET_FIELDS',
            payload: getConnectorFieldsFromUserActions(newConnectorId, userActions ?? []),
          });
        }
      },
      [currentConnector, userActions, connectors]
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
      connectors,
    });

    const { pushButton, pushCallouts } = usePushToService({
      connector: {
        ...caseData.connector,
        name: isEmpty(connectorName) ? caseData.connector.name : connectorName,
      },
      caseServices,
      caseId: caseData.id,
      caseStatus: caseData.status,
      connectors,
      hasDataToPush,
      onEditClick,
      updateCase,
      userCanCrud,
      isValidConnector,
    });

    return (
      <EuiText>
        <MyFlexGroup
          alignItems="center"
          gutterSize="xs"
          justifyContent="spaceBetween"
          responsive={false}
        >
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
          {!isLoading && !editConnector && pushCallouts && permissionsError == null && (
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
                      connectors,
                      dataTestSubj: 'caseConnectors',
                      defaultValue: selectedConnector,
                      disabled: !userCanCrud,
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
            {!editConnector && permissionsError && (
              <EuiText data-test-subj="edit-connector-permissions-error-msg" size="s">
                <span>{permissionsError}</span>
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
          {pushCallouts == null &&
            !isLoading &&
            !editConnector &&
            userCanCrud &&
            !permissionsError && (
              <EuiFlexItem data-test-subj="has-data-to-push-button" grow={false}>
                <span>{pushButton}</span>
              </EuiFlexItem>
            )}
        </MyFlexGroup>
      </EuiText>
    );
  }
);

EditConnector.displayName = 'EditConnector';
