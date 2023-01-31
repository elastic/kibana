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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import './connector_add_modal.scss';
import { betaBadgeProps } from './beta_badge_props';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { ActionType, ActionConnector, ActionTypeRegistryContract } from '../../../types';
import { useKibana } from '../../../common/lib/kibana';
import { useCreateConnector } from '../../hooks/use_create_connector';
import { ConnectorForm, ConnectorFormState } from './connector_form';
import { ConnectorFormSchema } from './types';

export interface ConnectorAddModalProps {
  actionType: ActionType;
  onClose: () => void;
  postSaveEventHandler?: (savedAction: ActionConnector) => void;
  actionTypeRegistry: ActionTypeRegistryContract;
}

const ConnectorAddModal = ({
  actionType,
  onClose,
  postSaveEventHandler,
  actionTypeRegistry,
}: ConnectorAddModalProps) => {
  const {
    application: { capabilities },
  } = useKibana().services;

  const { isLoading: isSavingConnector, createConnector } = useCreateConnector();
  const isMounted = useRef(false);
  const initialConnector = {
    actionTypeId: actionType.id,
    isDeprecated: false,
    isMissingSecrets: false,
    config: {},
    secrets: {},
  };

  const canSave = hasSaveActionsCapability(capabilities);
  const actionTypeModel = actionTypeRegistry.get(actionType.id);

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

  return (
    <EuiModal className="actConnectorModal" data-test-subj="connectorAddModal" onClose={closeModal}>
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
                    label={betaBadgeProps.label}
                    tooltipContent={betaBadgeProps.tooltipContent}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>

      <EuiModalBody>
        <ConnectorForm
          actionTypeModel={actionTypeModel}
          connector={initialConnector}
          isEdit={false}
          onChange={setFormState}
        />
        {preSubmitValidationErrorMessage}
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
