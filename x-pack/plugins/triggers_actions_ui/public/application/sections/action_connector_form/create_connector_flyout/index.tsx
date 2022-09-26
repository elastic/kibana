/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiFlyout, EuiFlyoutBody } from '@elastic/eui';

import { getConnectorCompatibility } from '@kbn/actions-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
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
import { ConnectorFormSchema } from '../types';
import { FlyoutHeader } from './header';
import { FlyoutFooter } from './footer';
import { UpgradeLicenseCallOut } from './upgrade_license_callout';

export interface CreateConnectorFlyoutProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: () => void;
  featureId?: string;
  onConnectorCreated?: (connector: ActionConnector) => void;
  onTestConnector?: (connector: ActionConnector) => void;
}

const CreateConnectorFlyoutComponent: React.FC<CreateConnectorFlyoutProps> = ({
  actionTypeRegistry,
  featureId,
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
    submit: async () => ({ isValid: false, data: {} as ConnectorFormSchema }),
    preSubmitValidator: null,
  });

  const initialConnector = {
    actionTypeId: actionType?.id ?? '',
    isDeprecated: false,
    config: {},
    secrets: {},
    isMissingSecrets: false,
  };

  const { preSubmitValidator, submit, isValid: isFormValid, isSubmitting } = formState;

  const hasErrors = isFormValid === false;
  const isSaving = isSavingConnector || isSubmitting;
  const hasConnectorTypeSelected = actionType != null;
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
      const validConnector = {
        actionTypeId,
        name: name ?? '',
        config: config ?? {},
        secrets: secrets ?? {},
      };

      const createdConnector = await createConnector(validConnector);
      return createdConnector;
    }
  }, [submit, preSubmitValidator, createConnector]);

  const resetActionType = useCallback(() => setActionType(null), []);

  const testConnector = useCallback(async () => {
    const createdConnector = await validateAndCreateConnector();

    if (createdConnector) {
      if (onConnectorCreated) {
        onConnectorCreated(createdConnector);
      }

      if (onTestConnector) {
        onTestConnector(createdConnector);
      }

      onClose();
    }
  }, [validateAndCreateConnector, onClose, onConnectorCreated, onTestConnector]);

  const onSubmit = useCallback(async () => {
    const createdConnector = await validateAndCreateConnector();
    if (createdConnector) {
      if (onConnectorCreated) {
        onConnectorCreated(createdConnector);
      }

      onClose();
    }
  }, [validateAndCreateConnector, onClose, onConnectorCreated]);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <EuiFlyout onClose={onClose} data-test-subj="create-connector-flyout">
      <FlyoutHeader
        icon={actionTypeModel?.iconClass}
        actionTypeName={actionType?.name}
        actionTypeMessage={actionTypeModel?.selectMessage}
        compatibility={getConnectorCompatibility(actionType?.supportedFeatureIds)}
        isExperimental={actionTypeModel?.isExperimental}
      />
      <EuiFlyoutBody
        banner={!actionType && hasActionsUpgradeableByTrial ? <UpgradeLicenseCallOut /> : null}
      >
        {hasConnectorTypeSelected ? (
          <>
            <ConnectorForm
              actionTypeModel={actionTypeModel}
              connector={initialConnector}
              isEdit={false}
              onChange={setFormState}
            />
            {!!preSubmitValidationErrorMessage && <p>{preSubmitValidationErrorMessage}</p>}

            <EuiFlexItem grow={false}>
              <EuiFlexGroup justifyContent="spaceBetween">
                <>
                  {onTestConnector && (
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        color="success"
                        data-test-subj="create-connector-flyout-save-test-btn"
                        type="submit"
                        isLoading={isSaving}
                        disabled={hasErrors || !canSave}
                        onClick={onTestConnector != null ? testConnector : undefined}
                      >
                        <FormattedMessage
                          id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveAndTestButtonLabel"
                          defaultMessage="Save & test"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      color="success"
                      data-test-subj="create-connector-flyout-save-btn"
                      type="submit"
                      isLoading={isSaving}
                      disabled={hasErrors || !canSave}
                      onClick={onSubmit}
                    >
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveButtonLabel"
                        defaultMessage="Save"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem />
                </>
              </EuiFlexGroup>
            </EuiFlexItem>
          </>
        ) : (
          <ActionTypeMenu
            featureId={featureId}
            onActionTypeChange={setActionType}
            setHasActionsUpgradeableByTrial={setHasActionsUpgradeableByTrial}
            actionTypeRegistry={actionTypeRegistry}
          />
        )}
      </EuiFlyoutBody>
      <FlyoutFooter
        hasConnectorTypeSelected={hasConnectorTypeSelected}
        onBack={resetActionType}
        onCancel={onClose}
      />
    </EuiFlyout>
  );
};

export const CreateConnectorFlyout = memo(CreateConnectorFlyoutComponent);

// eslint-disable-next-line import/no-default-export
export { CreateConnectorFlyout as default };
