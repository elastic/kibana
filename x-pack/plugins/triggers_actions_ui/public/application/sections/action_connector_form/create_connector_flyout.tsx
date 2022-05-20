/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiButton,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiCallOut,
  EuiSpacer,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { HttpSetup } from '@kbn/core/public';

import {
  ActionConnector,
  ActionType,
  ActionTypeModel,
  ActionTypeRegistryContract,
} from '../../../types';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { ActionTypeMenu } from './action_type_menu';
import { useCreateConnector } from '../../hooks/use_create_connector';
import { ConnectorForm, CreateConnectorFormState } from './connector_form';
import { InitialConnector } from './connector_reducer';
import { Connector } from './types';

interface CreateConnectorFlyoutProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: () => void;
  onTestConnector?: (connector: ActionConnector) => void;
}

interface SaveButtonProps {
  isSaving: boolean;
  disabled: boolean;
  createConnector: () => Promise<ActionConnector>;
  onSubmit: () => Promise<void>;
  onTestConnector?: (connector: ActionConnector) => void;
}

const SaveButton: React.FC<SaveButtonProps> = ({
  isSaving,
  disabled,
  onTestConnector,
  createConnector,
  onSubmit,
}) => {
  return (
    <>
      {onTestConnector && (
        <EuiFlexItem grow={false}>
          <EuiButton
            color="success"
            data-test-subj="saveAndTestNewActionButton"
            type="submit"
            isLoading={isSaving}
            disabled={disabled}
            onClick={async () => {
              onSubmit();
              const savedConnector = await createConnector();
              if (savedConnector) {
                onTestConnector(savedConnector);
              }
            }}
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
          data-test-subj="saveNewActionButton"
          type="submit"
          isLoading={isSaving}
          disabled={disabled}
          onClick={onSubmit}
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveButtonLabel"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiFlexItem>
    </>
  );
};

interface CancelBackButtonProps {
  onClick: () => void;
}

const CancelButton: React.FC<CancelBackButtonProps> = ({ onClick }) => {
  return (
    <EuiButtonEmpty data-test-subj="cancelButton" onClick={onClick}>
      {i18n.translate('xpack.triggersActionsUI.sections.actionConnectorAdd.cancelButtonLabel', {
        defaultMessage: 'Cancel',
      })}
    </EuiButtonEmpty>
  );
};

const BackButton: React.FC<CancelBackButtonProps> = ({ onClick }) => {
  return (
    <EuiButtonEmpty data-test-subj="backButton" onClick={onClick}>
      {i18n.translate('xpack.triggersActionsUI.sections.actionConnectorAdd.backButtonLabel', {
        defaultMessage: 'Back',
      })}
    </EuiButtonEmpty>
  );
};

const UpgradeYourLicenseCallOut: React.FC<{ http: HttpSetup }> = ({ http }) => (
  <EuiCallOut
    title={i18n.translate(
      'xpack.triggersActionsUI.sections.actionConnectorAdd.upgradeYourPlanBannerTitle',
      { defaultMessage: 'Upgrade your license to access all connectors' }
    )}
  >
    <FormattedMessage
      id="xpack.triggersActionsUI.sections.actionConnectorAdd.upgradeYourPlanBannerMessage"
      defaultMessage="Upgrade your license or start a 30-day free trial for immediate access to all third-party connectors."
    />
    <EuiSpacer size="s" />
    <EuiFlexGroup gutterSize="s" wrap={true}>
      <EuiFlexItem grow={false}>
        <EuiButton
          href={`${http.basePath.get()}/app/management/stack/license_management`}
          iconType="gear"
          target="_blank"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.actionConnectorAdd.manageLicensePlanBannerLinkTitle"
            defaultMessage="Manage license"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          href={VIEW_LICENSE_OPTIONS_LINK}
          iconType="popout"
          iconSide="right"
          target="_blank"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.actionConnectorAdd.upgradeYourPlanBannerLinkTitle"
            defaultMessage="Subscription plans"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiCallOut>
);

const FlyoutHeaderContent: React.FC<{
  actionTypeModel: ActionTypeModel | null;
  actionType: ActionType | null;
}> = ({ actionTypeModel, actionType }) => {
  return (
    <EuiFlexGroup gutterSize="m" alignItems="center">
      {actionTypeModel != null && actionTypeModel.iconClass ? (
        <EuiFlexItem grow={false}>
          <EuiIcon type={actionTypeModel.iconClass} size="xl" />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem>
        {actionTypeModel != null && actionType ? (
          <>
            <EuiTitle size="s">
              <h3 id="flyoutTitle">
                <FormattedMessage
                  defaultMessage="{actionTypeName} connector"
                  id="xpack.triggersActionsUI.sections.addConnectorForm.flyoutTitle"
                  values={{
                    actionTypeName: actionType.name,
                  }}
                />
              </h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              {actionTypeModel.selectMessage}
            </EuiText>
          </>
        ) : (
          <EuiTitle size="s">
            <h3 id="selectConnectorFlyoutTitle">
              <FormattedMessage
                defaultMessage="Select a connector"
                id="xpack.triggersActionsUI.sections.addConnectorForm.selectConnectorFlyoutTitle"
              />
            </h3>
          </EuiTitle>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const CreateConnectorFlyoutComponent: React.FC<CreateConnectorFlyoutProps> = ({
  actionTypeRegistry,
  onClose,
  onTestConnector,
}) => {
  const {
    docLinks,
    http,
    application: { capabilities },
  } = useKibana().services;
  const { isLoading: isSavingConnector, createConnector } = useCreateConnector();

  const isMounted = useRef(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [preSubmitValidationErrorMessage, setPreSubmitValidationErrorMessage] =
    useState<ReactNode>(null);
  const [hasActionsUpgradeableByTrial, setHasActionsUpgradeableByTrial] = useState<boolean>(false);
  const canSave = hasSaveActionsCapability(capabilities);
  const [formState, setFormState] = useState<CreateConnectorFormState>({
    isSubmitted: false,
    isSubmitting: false,
    isValid: undefined,
    submit: async () => ({ isValid: false, data: {} as Connector }),
    preSubmitValidator: null,
  });

  const initialConnector: InitialConnector<Record<string, unknown>, Record<string, unknown>> = {
    actionTypeId: actionType?.id ?? '',
    config: {},
    secrets: {},
  };

  const { preSubmitValidator, submit, isValid: isFormValid, isSubmitting } = formState;
  const hasErrors = isFormValid === false;
  const isSaving = isSavingConnector || isSubmitting;

  const onClickSave = useCallback(async () => {
    const { isValid, data } = await submit();
    console.log('isValid', isValid);
    console.log('Form data:', data);
    // const { isValid, data } = await submit();

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

        /**
         * At this point the form is valid
         * and there are no pre submit error messages.
         * For that reason, we clear the pre submit errors
         * in case they were set in a previous run.
         */
        setPreSubmitValidationErrorMessage(null);
      }
    }
  }, [submit, preSubmitValidator]);

  const resetActionType = useCallback(() => setActionType(null), []);

  const actionTypeModel: ActionTypeModel | null =
    actionType != null ? actionTypeRegistry.get(actionType.id) : null;

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <FlyoutHeaderContent actionTypeModel={actionTypeModel} actionType={actionType} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        banner={
          !actionType && hasActionsUpgradeableByTrial ? (
            <UpgradeYourLicenseCallOut http={http} />
          ) : null
        }
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
            {preSubmitValidationErrorMessage}
            <ConnectorForm
              actionTypeModel={actionTypeModel}
              connector={initialConnector}
              isEdit={false}
              onChange={setFormState}
            />
          </>
        ) : null}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {actionType != null ? (
              <BackButton onClick={resetActionType} />
            ) : (
              <CancelButton onClick={onClose} />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween">
              <SaveButton
                disabled={hasErrors || !canSave}
                isSaving={isSaving}
                onSubmit={onClickSave}
                createConnector={() => {}}
                onTestConnector={onTestConnector}
              />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const CreateConnectorFlyout = memo(CreateConnectorFlyoutComponent);
