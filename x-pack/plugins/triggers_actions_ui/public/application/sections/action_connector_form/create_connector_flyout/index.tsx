/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { EuiFlyout, EuiFlyoutBody } from '@elastic/eui';

import {
  ActionConnector,
  ActionType,
  ActionTypeModel,
  ActionTypeRegistryContract,
} from '../../../../types';
import { hasSaveActionsCapability } from '../../../lib/capabilities';
import { useKibana } from '../../../../common/lib/kibana';
import { ActionTypeMenu } from '../action_type_menu';
import { useCreateConnector } from '../../../hooks/use_create_connector';
import { ConnectorForm, ConnectorFormState } from '../connector_form';
import { Connector } from '../types';
import { FlyoutHeader } from './header';
import { FlyoutFooter } from './foooter';
import { UpgradeLicenseCallOut } from './upgrade_license_callout';

export interface CreateConnectorFlyoutProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: () => void;
  onConnectorCreated?: (connector: ActionConnector) => void;
  onTestConnector?: (connector: ActionConnector) => void;
}

const CreateConnectorFlyoutComponent: React.FC<CreateConnectorFlyoutProps> = ({
  actionTypeRegistry,
  onClose,
  onConnectorCreated,
  onTestConnector,
}) => {
  const {
    application: { capabilities },
  } = useKibana().services;
  const { isLoading: isSavingConnector, createConnector } = useCreateConnector();

  const isMounted = useRef(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [hasActionsUpgradeableByTrial, setHasActionsUpgradeableByTrial] = useState<boolean>(false);
  const canSave = hasSaveActionsCapability(capabilities);

  const [preSubmitValidationErrorMessage, setPreSubmitValidationErrorMessage] =
    useState<ReactNode>(null);

  const [formState, setFormState] = useState<ConnectorFormState>({
    isSubmitted: false,
    isSubmitting: false,
    isValid: undefined,
    submit: async () => ({ isValid: false, data: {} as Connector }),
    preSubmitValidator: null,
  });

  const initialConnector = {
    actionTypeId: actionType?.id ?? '',
    name: '',
    config: {},
    secrets: {},
    isMissingSecrets: false,
  };

  const { preSubmitValidator, submit, isValid: isFormValid, isSubmitting } = formState;

  const hasErrors = isFormValid === false;
  const isSaving = isSavingConnector || isSubmitting;
  const footerButtonType = actionType != null ? 'back' : 'cancel';
  const actionTypeModel: ActionTypeModel | null =
    actionType != null ? actionTypeRegistry.get(actionType.id) : null;

  const validateAndCreateConnector = useCallback(async () => {
    setPreSubmitValidationErrorMessage(null);

    const { isValid, data } = await submit();
    if (!isMounted.current) {
      // User has closed the flyout meanwhile submitting the form
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
      const validConnector = { actionTypeId, name, config, secrets };

      const createdConnector = await createConnector(validConnector);
      return createdConnector;
    }
  }, [submit, preSubmitValidator]);

  const resetActionType = useCallback(() => setActionType(null), []);

  const testConnector = useCallback(async () => {
    const createdConnector = await validateAndCreateConnector();
    onClose();

    if (createdConnector) {
      if (onConnectorCreated) {
        onConnectorCreated(createdConnector);
      }

      if (onTestConnector) {
        onTestConnector(createdConnector);
      }
    }
  }, [validateAndCreateConnector, onConnectorCreated]);

  const onSubmit = useCallback(async () => {
    const createdConnector = await validateAndCreateConnector();
    onClose();

    if (onConnectorCreated && createdConnector) {
      onConnectorCreated(createdConnector);
    }
  }, [validateAndCreateConnector, onConnectorCreated]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <EuiFlyout onClose={onClose}>
      <FlyoutHeader
        icon={actionTypeModel?.iconClass}
        actionTypeName={actionType?.name}
        actionTypeMessage={actionTypeModel?.selectMessage}
      />
      <EuiFlyoutBody
        banner={!actionType && hasActionsUpgradeableByTrial ? <UpgradeLicenseCallOut /> : null}
      >
        {actionType == null ? (
          <ActionTypeMenu
            onActionTypeChange={setActionType}
            setHasActionsUpgradeableByTrial={setHasActionsUpgradeableByTrial}
            actionTypeRegistry={actionTypeRegistry}
          />
        ) : null}
        {actionType != null ? (
          <>
            <ConnectorForm
              actionTypeModel={actionTypeModel}
              connector={initialConnector}
              isEdit={false}
              onChange={setFormState}
            />
            {preSubmitValidationErrorMessage}
          </>
        ) : null}
      </EuiFlyoutBody>
      <FlyoutFooter
        buttonType={footerButtonType}
        onBack={resetActionType}
        onCancel={onClose}
        disabled={hasErrors || !canSave}
        isSaving={isSaving}
        onSubmit={onSubmit}
        onTestConnector={testConnector}
      />
    </EuiFlyout>
  );
};

export const CreateConnectorFlyout = memo(CreateConnectorFlyoutComponent);

// eslint-disable-next-line import/no-default-export
export { CreateConnectorFlyout as default };
