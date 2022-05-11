/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
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
import {
  useForm,
  Form,
  FormConfig,
  UseField,
  useFormData,
  FormHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { HttpSetup } from '@kbn/core/public';

import {
  ActionConnector,
  ActionType,
  ActionTypeModel,
  ActionTypeRegistryContract,
} from '../../../types';
import { CreateConnectorForm } from './create_connector_form';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { ActionTypeMenu } from './action_type_menu';
import { useCreateConnector } from '../../hooks/use_create_connector';

interface CreateConnectorFlyoutProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: () => void;
  onTestConnector?: (connector: ActionConnector) => void;
}

interface ConnectorFormData {
  actionType: ActionType | null;
  name: string;
  [key: string]: unknown;
}

interface SaveButtonProps {
  isSaving: boolean;
  createConnector: () => Promise<ActionConnector>;
  onSubmit: FormHook['submit'];
  onTestConnector?: (connector: ActionConnector) => void;
}

const SaveButton: React.FC<SaveButtonProps> = ({
  isSaving,
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
  const [hasActionsUpgradeableByTrial, setHasActionsUpgradeableByTrial] = useState<boolean>(false);
  const canSave = hasSaveActionsCapability(capabilities);
  const { isLoading: isSavingConnector, createConnector } = useCreateConnector();

  const onFormSubmit: FormConfig<ConnectorFormData>['onSubmit'] = async (data, isValid) => {
    console.log('Form data:', data);
  };

  const { form } = useForm({ onSubmit: onFormSubmit, defaultValue: { config: {}, secrets: {} } });
  const [{ actionType }] = useFormData<ConnectorFormData>({ form, watch: ['actionType'] });
  const { setFieldValue } = form;

  const resetActionType = useCallback(() => setFieldValue('actionType', null), [setFieldValue]);

  const actionTypeModel: ActionTypeModel | null =
    actionType != null ? actionTypeRegistry.get(actionType.id) : null;

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
        <Form form={form}>
          <UseField<ActionType | null> path="actionType" defaultValue={null}>
            {(field) => {
              const { setValue } = field;
              if (actionType != null) {
                return null;
              }

              return (
                <ActionTypeMenu
                  onActionTypeChange={(type: ActionType) => setValue(type)}
                  setHasActionsUpgradeableByTrial={setHasActionsUpgradeableByTrial}
                  actionTypeRegistry={actionTypeRegistry}
                />
              );
            }}
          </UseField>
          {actionType != null ? (
            <CreateConnectorForm actionTypeRegistry={actionTypeRegistry} isEdit={false} />
          ) : null}
        </Form>
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
                isSaving={isSavingConnector}
                onSubmit={form.submit}
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
