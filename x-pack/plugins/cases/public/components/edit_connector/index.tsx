/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable complexity */

import React, { useCallback, useState } from 'react';
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

import {
  Form,
  UseField,
  useForm,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { CaseUI, CaseConnectors } from '../../../common/ui/types';
import type { ActionConnector, CaseConnector } from '../../../common/api';
import { NONE_CONNECTOR_ID } from '../../../common/api';
import { ConnectorSelector } from '../connector_selector/form';
import * as i18n from './translations';
import { getConnectorById, getConnectorsFormValidators } from '../utils';
import { usePushToService } from '../use_push_to_service';
import { useApplicationCapabilities } from '../../common/lib/kibana';
import { PushButton } from './push_button';
import { PushCallouts } from './push_callouts';
import { normalizeActionConnector, getNoneConnector } from '../configure_cases/utils';
import { ConnectorsForm, FormState } from './connectors_form';
import { ConnectorFieldsForm } from '../connectors/fields_form';
import { ConnectorFieldsPreviewForm } from '../connectors/fields_preview_form';

export interface EditConnectorProps {
  caseData: CaseUI;
  caseConnectors: CaseConnectors;
  supportedActionConnectors: ActionConnector[];
  isLoading: boolean;
  onSubmit: (connector: CaseConnector, onError: () => void, onSuccess: () => void) => void;
}

const fieldsInitialFormState = {
  isValid: true,
  validate: async () => true,
  getData: () => ({
    whatever: null,
  }),
};

export const EditConnector = React.memo(
  ({
    caseData,
    caseConnectors,
    supportedActionConnectors,
    isLoading,
    onSubmit,
  }: EditConnectorProps) => {
    const caseConnectorFields = caseData.connector.fields;
    const caseConnectorId = caseData.connector.id;
    const caseActionConnector = getConnectorById(caseData.connector.id, supportedActionConnectors);
    const isValidConnector = !!caseActionConnector;

    const [isEdit, setIsEdit] = useState(false);

    const { form } = useForm({
      defaultValue: { connectorId: caseConnectorId },
      options: { stripEmptyFields: false },
    });

    const { actions } = useApplicationCapabilities();
    const actionsReadCapabilities = actions.read;

    const { submit } = form;
    const [formData] = useFormData<{
      connectorId: string;
    }>({ form });

    const currentConnectorId = formData.connectorId;
    const currentConnector = caseConnectors[currentConnectorId] ?? null;
    const currentActionConnector = getConnectorById(currentConnectorId, supportedActionConnectors);
    const currentConnectorFields = caseConnectors[currentConnectorId]?.fields;

    /**
     *  only enable the save button if changes were made to the previous selected
     * connector or its fields
     * null and none are equivalent to `no connector`.
     * This makes sure we don't enable the button when the "no connector" option is selected
     * by default. e.g. when a case is created without a connector
     */
    const isDefaultNoneConnectorSelected =
      currentConnector === null && caseConnectorId === NONE_CONNECTOR_ID;

    const enableSave =
      (!isDefaultNoneConnectorSelected && currentConnector?.id !== caseConnectorId) ||
      !deepEqual(currentConnectorFields, caseConnectorFields);

    const [formState, setFormState] = useState<FormState>(fieldsInitialFormState);

    const onSubmitConnector = useCallback(async () => {
      const { isValid, data: newData } = await submit();
      const areFieldsValid = formState.isValid ?? (await formState.validate());
      console.log('areFieldsValid', areFieldsValid);
      console.log('Form data', formState.getData());
      console.log('newData', newData);

      // if (isValid && newData.connectorId) {
      //   const connector = getConnectorById(newData.connectorId, supportedActionConnectors);
      //   const connectorToUpdate = connector
      //     ? normalizeActionConnector(connector)
      //     : getNoneConnector();

      //   const connectorWithFields = {
      //     ...connectorToUpdate,
      //     // fields: newData.fields,
      //   } as CaseConnector;

      //   onSubmit(connectorWithFields, noop, noop);
      //   setIsEdit(false);
      // }
    }, [submit, supportedActionConnectors, onSubmit]);

    const onEditClick = useCallback(() => setIsEdit(true), []);
    const onCancelConnector = useCallback(() => setIsEdit(false), []);

    const connectorIdConfig = getConnectorsFormValidators({
      config: {},
      connectors: supportedActionConnectors,
    });

    const connectorWithName = {
      ...caseData.connector,
      name: isEmpty(caseActionConnector?.name)
        ? caseData.connector.name
        : caseActionConnector?.name ?? '',
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
            {!isLoading && !isEdit && hasPushPermissions && actionsReadCapabilities ? (
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
            {!isLoading && !isEdit && hasErrorMessages && actionsReadCapabilities && (
              <EuiFlexItem data-test-subj="push-callouts">
                <PushCallouts
                  errorsMsg={errorsMsg}
                  hasLicenseError={hasLicenseError}
                  hasConnectors={supportedActionConnectors.length > 0}
                  onEditClick={onEditClick}
                />
              </EuiFlexItem>
            )}
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="none" direction="row">
                  <EuiFlexItem>
                    <Form form={form}>
                      <UseField
                        path="connectorId"
                        config={connectorIdConfig}
                        component={ConnectorSelector}
                        componentProps={{
                          connectors: supportedActionConnectors,
                          dataTestSubj: 'caseConnectors',
                          defaultValue: caseConnectorId,
                          disabled: !hasPushPermissions,
                          idAria: 'caseConnectors',
                          isEdit,
                          isLoading,
                        }}
                      />
                    </Form>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem data-test-subj="edit-connector-fields-form-flex-item">
                {!isEdit && !actionsReadCapabilities && (
                  <EuiText data-test-subj="edit-connector-permissions-error-msg" size="s">
                    <span>{i18n.READ_ACTIONS_PERMISSIONS_ERROR_MSG}</span>
                  </EuiText>
                )}
                {!isEdit ? (
                  <ConnectorFieldsPreviewForm
                    connector={currentActionConnector}
                    fields={currentConnectorFields}
                  />
                ) : (
                  <ConnectorsForm
                    key={currentConnectorId}
                    currentActionConnector={currentActionConnector}
                    currentConnectorFields={currentConnectorFields}
                    onChange={setFormState}
                  />
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
            {isEdit && (
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
              !isEdit &&
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
