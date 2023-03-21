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
  EuiButtonIcon,
} from '@elastic/eui';
import { isEmpty, noop } from 'lodash/fp';

import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, UseField, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { Case, CaseConnectors } from '../../../common/ui/types';
import type { ActionConnector, CaseConnector, ConnectorTypeFields } from '../../../common/api';
import { NONE_CONNECTOR_ID } from '../../../common/api';
import { ConnectorSelector } from '../connector_selector/form';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { schema } from './schema';
import * as i18n from './translations';
import { getConnectorById, getConnectorsFormValidators } from '../utils';
import { usePushToService } from '../use_push_to_service';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import { PushButton } from './push_button';
import { PushCallouts } from './push_callouts';
import { normalizeActionConnector, getNoneConnector } from '../configure_cases/utils';

export interface EditConnectorProps {
  caseData: Case;
  caseConnectors: CaseConnectors;
  supportedActionConnectors: ActionConnector[];
  isLoading: boolean;
  onSubmit: (connector: CaseConnector, onError: () => void, onSuccess: () => void) => void;
}

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
    supportedActionConnectors,
    isLoading,
    onSubmit,
  }: EditConnectorProps) => {
    const caseFields = caseData.connector.fields;
    const selectedConnector = caseData.connector.id;
    const actionConnector = getConnectorById(caseData.connector.id, supportedActionConnectors);
    const isValidConnector = !!actionConnector;

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
        currentConnector: actionConnector,
      }
    );

    /**
     *  only enable the save button if changes were made to the previous selected
     * connector or its fields
     * null and none are equivalent to `no connector`.
     * This makes sure we don't enable the button when the "no connector" option is selected
     * by default. e.g. when a case is created without a connector
     */
    const isDefaultNoneConnectorSelected =
      currentConnector === null && selectedConnector === NONE_CONNECTOR_ID;

    const enableSave =
      (!isDefaultNoneConnectorSelected && currentConnector?.id !== selectedConnector) ||
      !deepEqual(fields, caseFields);

    const onChangeConnector = useCallback(
      (newConnectorId) => {
        // change connector on dropdown action
        if (currentConnector?.id !== newConnectorId) {
          dispatch({
            type: 'SET_CURRENT_CONNECTOR',
            payload: getConnectorById(newConnectorId, supportedActionConnectors),
          });
          dispatch({
            type: 'SET_FIELDS',
            payload: caseConnectors[newConnectorId]?.fields ?? null,
          });
        }
      },
      [currentConnector, caseConnectors, supportedActionConnectors]
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

    const resetConnector = useCallback(() => {
      setFieldValue('connectorId', selectedConnector);

      dispatch({
        type: 'SET_CURRENT_CONNECTOR',
        payload: actionConnector,
      });

      dispatch({
        type: 'SET_FIELDS',
        payload: caseFields,
      });

      dispatch({
        type: 'SET_EDIT_CONNECTOR',
        payload: false,
      });
    }, [actionConnector, caseFields, selectedConnector, setFieldValue]);

    const onError = useCallback(() => {
      resetConnector();
    }, [resetConnector]);

    const onCancelConnector = useCallback(() => {
      resetConnector();
    }, [resetConnector]);

    const onSubmitConnector = useCallback(async () => {
      const { isValid, data: newData } = await submit();

      if (isValid && newData.connectorId) {
        const connector = getConnectorById(newData.connectorId, supportedActionConnectors);
        const connectorToUpdate = connector
          ? normalizeActionConnector(connector)
          : getNoneConnector();

        const connectorWithFields = { ...connectorToUpdate, fields } as CaseConnector;
        onSubmit(connectorWithFields, onError, noop);

        dispatch({
          type: 'SET_EDIT_CONNECTOR',
          payload: false,
        });
      }
    }, [submit, supportedActionConnectors, fields, onSubmit, onError]);

    const onEditClick = useCallback(() => {
      dispatch({
        type: 'SET_EDIT_CONNECTOR',
        payload: true,
      });
    }, [dispatch]);

    const connectorIdConfig = getConnectorsFormValidators({
      config: schema.connectorId as FieldConfig,
      connectors: supportedActionConnectors,
    });

    const connectorWithName = {
      ...caseData.connector,
      name: isEmpty(actionConnector?.name) ? caseData.connector.name : actionConnector?.name ?? '',
    };

    const {
      errorsMsg,
      needsToBePushed,
      hasBeenPushed,
      isLoading: isLoadingPushToService,
      hasPushPermissions,
      hasErrorMessages,
      hasLicenseError,
      handlePushToService,
    } = usePushToService({
      connector: connectorWithName,
      caseConnectors,
      caseId: caseData.id,
      caseStatus: caseData.status,
      isValidConnector,
    });

    const disablePushButton =
      isLoadingPushToService ||
      errorsMsg.length > 0 ||
      !hasPushPermissions ||
      !isValidConnector ||
      !needsToBePushed;

    return (
      <EuiFlexItem grow={false}>
        <EuiText>
          <EuiFlexGroup
            alignItems="center"
            gutterSize="xs"
            justifyContent="spaceBetween"
            responsive={false}
            data-test-subj="case-view-edit-connector"
          >
            <EuiFlexItem grow={false} data-test-subj="connector-edit-header">
              <h4>{i18n.CONNECTORS}</h4>
            </EuiFlexItem>
            {!isLoading && !editConnector && hasPushPermissions && actionsReadCapabilities ? (
              <EuiFlexItem data-test-subj="connector-edit" grow={false}>
                <EuiButtonIcon
                  data-test-subj="connector-edit-button"
                  aria-label={i18n.EDIT_CONNECTOR_ARIA}
                  iconType="pencil"
                  onClick={onEditClick}
                />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          <EuiHorizontalRule margin="xs" />
          <EuiFlexGroup data-test-subj="edit-connectors" direction="column" alignItems="stretch">
            {!isLoading && !editConnector && hasErrorMessages && actionsReadCapabilities && (
              <EuiFlexItem data-test-subj="push-callouts">
                <PushCallouts
                  errorsMsg={errorsMsg}
                  hasLicenseError={hasLicenseError}
                  hasConnectors={supportedActionConnectors.length > 0}
                  onEditClick={onEditClick}
                />
              </EuiFlexItem>
            )}
            <Form form={form}>
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
                        defaultValue: selectedConnector,
                        disabled: !hasPushPermissions,
                        idAria: 'caseConnectors',
                        isEdit: editConnector,
                        isLoading,
                      }}
                      onChange={onChangeConnector}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </Form>
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
            {!hasErrorMessages &&
              !isLoading &&
              !editConnector &&
              hasPushPermissions &&
              actionsReadCapabilities && (
                <EuiFlexItem grow={false}>
                  <span>
                    <PushButton
                      hasBeenPushed={hasBeenPushed}
                      disabled={disablePushButton}
                      isLoading={isLoadingPushToService}
                      pushToService={handlePushToService}
                      errorsMsg={errorsMsg}
                      showTooltip={errorsMsg.length > 0 || !needsToBePushed || !hasPushPermissions}
                      connectorName={connectorWithName.name}
                    />
                  </span>
                </EuiFlexItem>
              )}
          </EuiFlexGroup>
        </EuiText>
      </EuiFlexItem>
    );
  }
);

EditConnector.displayName = 'EditConnector';
