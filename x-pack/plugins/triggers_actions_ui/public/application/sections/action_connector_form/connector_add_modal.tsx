/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiModal,
  EuiButton,
  EuiButtonEmpty,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiFlexItem,
  EuiIcon,
  EuiFlexGroup,
  EuiBetaBadge,
  EuiButtonGroup,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import './connector_add_modal.scss';
import { TECH_PREVIEW_DESCRIPTION, TECH_PREVIEW_LABEL } from '../translations';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import {
  ActionType,
  ActionConnector,
  ActionTypeRegistryContract,
  ActionTypeModel,
  ActionTypeIndex,
} from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
import { useCreateConnector } from '../../hooks/use_create_connector';
import { ConnectorForm, ConnectorFormState, ResetForm } from './connector_form';
import { ConnectorFormSchema } from './types';
import { loadActionTypes } from '../../lib/action_connector_api';
import { SectionLoading } from '../../components';

export interface ConnectorAddModalProps {
  actionType: ActionType;
  onClose: () => void;
  postSaveEventHandler?: (savedAction: ActionConnector) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
}

const ConnectorAddModal = ({
  actionType: tempActionType,
  onClose,
  postSaveEventHandler,
  actionTypeRegistry,
}: ConnectorAddModalProps) => {
  const {
    application: { capabilities },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const [actionType, setActionType] = useState<ActionType>(tempActionType);
  const [loadingActionTypes, setLoadingActionTypes] = useState<boolean>(false);
  const [allActionTypes, setAllActionTypes] = useState<ActionTypeIndex | undefined>(undefined);
  const { isLoading: isSavingConnector, createConnector } = useCreateConnector();
  const isMounted = useRef(false);
  const [initialConnector, setInitialConnector] = useState({
    actionTypeId: actionType?.id ?? '',
    isDeprecated: false,
    config: {},
    secrets: {},
    isMissingSecrets: false,
  });

  const canSave = hasSaveActionsCapability(capabilities);
  const actionTypeModel = actionTypeRegistry.get(actionType.id);
  const groupActionTypeModel: Array<ActionTypeModel & { name: string }> =
    actionTypeModel && actionTypeModel.subtype
      ? (actionTypeModel?.subtype ?? []).map((subtypeAction) => ({
          ...actionTypeRegistry.get(subtypeAction.id),
          name: subtypeAction.name,
        }))
      : [];

  const groupActionButtons = groupActionTypeModel.map((gAction) => ({
    id: gAction.id,
    label: gAction.name,
    'data-test-subj': `${gAction.id}Button`,
  }));

  const resetConnectorForm = useRef<ResetForm | undefined>();

  const setResetForm = (reset: ResetForm) => {
    resetConnectorForm.current = reset;
  };

  const onChangeGroupAction = (id: string) => {
    if (allActionTypes && allActionTypes[id]) {
      setActionType(allActionTypes[id]);
      setInitialConnector({
        actionTypeId: id,
        isDeprecated: false,
        config: {},
        secrets: {},
        isMissingSecrets: false,
      });
      if (resetConnectorForm.current) {
        resetConnectorForm.current({
          resetValues: true,
          defaultValue: {
            actionTypeId: id,
            isDeprecated: false,
            config: {},
            secrets: {},
          },
        });
      }
    }
  };

  const [preSubmitValidationErrorMessage, setPreSubmitValidationErrorMessage] =
    useState<ReactNode>(null);

  const [formState, setFormState] = useState<ConnectorFormState>({
    isSubmitted: false,
    isSubmitting: false,
    isValid: undefined,
    submit: async () => ({ isValid: false, data: {} as ConnectorFormSchema }),
    preSubmitValidator: null,
  });

  const { preSubmitValidator, submit, isValid: isFormValid, isSubmitting } = formState;
  const hasErrors = isFormValid === false;
  const isSaving = isSavingConnector || isSubmitting;

  const validateAndCreateConnector = useCallback(async () => {
    setPreSubmitValidationErrorMessage(null);

    const { isValid, data } = await submit();

    if (!isMounted.current) {
      // User has closed the modal meanwhile submitting the form
      return;
    }

    if (isValid) {
      if (preSubmitValidator) {
        const validatorRes = await preSubmitValidator();

        if (validatorRes) {
          setPreSubmitValidationErrorMessage(validatorRes.message);
          return;
        }
      }

      /**
       * At this point the form is valid
       * and there are no pre submit error messages.
       */

      const { actionTypeId, name, config, secrets } = data;
      const validConnector = { actionTypeId, name: name ?? '', config, secrets };

      const createdConnector = await createConnector(validConnector);
      return createdConnector;
    }
  }, [submit, preSubmitValidator, createConnector]);

  const closeModal = useCallback(() => {
    onClose();
  }, [onClose]);

  const onSubmit = useCallback(async () => {
    const createdConnector = await validateAndCreateConnector();
    if (createdConnector) {
      closeModal();

      if (postSaveEventHandler) {
        postSaveEventHandler(createdConnector);
      }
    }
  }, [validateAndCreateConnector, closeModal, postSaveEventHandler]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoadingActionTypes(true);
        const availableActionTypes = await loadActionTypes({ http });
        setLoadingActionTypes(false);

        const index: ActionTypeIndex = {};
        for (const actionTypeItem of availableActionTypes) {
          index[actionTypeItem.id] = actionTypeItem;
        }
        setAllActionTypes(index);
      } catch (e) {
        if (toasts) {
          toasts.addDanger({
            title: i18n.translate(
              'xpack.triggersActionsUI.sections.actionsConnectorsList.unableToLoadConnectorTypesMessage',
              { defaultMessage: 'Unable to load connector types' }
            ),
          });
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <EuiModal
      className="actConnectorModal"
      data-test-subj="connectorAddModal"
      onClose={closeModal}
      style={{ width: actionTypeRegistry.get(actionType.id).modalWidth }}
    >
      <EuiModalHeader>
        <EuiFlexGroup gutterSize="m" alignItems="center">
          {actionTypeModel && actionTypeModel.iconClass ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={actionTypeModel.iconClass} size="xl" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" justifyContent="center" alignItems="center">
              <EuiFlexItem>
                <EuiModalHeaderTitle size="s" component="h3" id="flyoutTitle">
                  <FormattedMessage
                    defaultMessage="{actionTypeName} connector"
                    id="xpack.triggersActionsUI.sections.addModalConnectorForm.flyoutTitle"
                    values={{
                      actionTypeName: actionType.name,
                    }}
                  />
                </EuiModalHeaderTitle>
              </EuiFlexItem>
              {actionTypeModel && actionTypeModel.isExperimental && (
                <EuiFlexItem className="betaBadgeFlexItem" grow={false}>
                  <EuiBetaBadge
                    label={TECH_PREVIEW_LABEL}
                    tooltipContent={TECH_PREVIEW_DESCRIPTION}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>

      <EuiModalBody>
        {loadingActionTypes ? (
          <SectionLoading>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.connectorAddModal.loadingConnectorTypesDescription"
              defaultMessage="Loading connector types…"
            />
          </SectionLoading>
        ) : (
          <>
            {groupActionTypeModel && (
              <>
                <EuiButtonGroup
                  isFullWidth
                  buttonSize="m"
                  color="primary"
                  legend=""
                  options={groupActionButtons}
                  idSelected={actionType.id}
                  onChange={onChangeGroupAction}
                  data-test-subj="slackTypeChangeButton"
                />
                <EuiSpacer size="xs" />
              </>
            )}
            <ConnectorForm
              actionTypeModel={actionTypeModel}
              connector={initialConnector}
              isEdit={false}
              onChange={setFormState}
              setResetForm={setResetForm}
            />
            {preSubmitValidationErrorMessage}
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={closeModal} isLoading={isSaving}>
          {i18n.translate(
            'xpack.triggersActionsUI.sections.addModalConnectorForm.cancelButtonLabel',
            {
              defaultMessage: 'Cancel',
            }
          )}
        </EuiButtonEmpty>
        {canSave ? (
          <EuiButton
            fill
            color="success"
            data-test-subj="saveActionButtonModal"
            type="submit"
            iconType="check"
            isLoading={isSaving}
            disabled={hasErrors}
            onClick={onSubmit}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.addModalConnectorForm.saveButtonLabel"
              defaultMessage="Save"
            />
          </EuiButton>
        ) : null}
      </EuiModalFooter>
    </EuiModal>
  );
};

// eslint-disable-next-line import/no-default-export
export { ConnectorAddModal as default };
