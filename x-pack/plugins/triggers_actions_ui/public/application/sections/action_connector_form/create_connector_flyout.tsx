/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
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

import { ActionConnector, ActionType, ActionTypeRegistryContract } from '../../../types';
import { CreateConnectorForm } from './create_connector_form';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../../common/constants';
import { ActionTypeMenu } from './action_type_menu';

interface CreateConnectorFlyoutProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: () => void;
  onTestConnector?: (connector: ActionConnector) => void;
}

interface ConnectorFormData {
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
  buttonType: 'cancel' | 'back';
  closeFlyout: () => void;
}

const CancelBackButton: React.FC<CancelBackButtonProps> = ({ buttonType, closeFlyout }) => {
  return (
    <EuiFlexItem grow={false}>
      {buttonType === 'cancel' ? (
        <EuiButtonEmpty data-test-subj="cancelButton" onClick={closeFlyout}>
          {i18n.translate('xpack.triggersActionsUI.sections.actionConnectorAdd.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
      ) : (
        <EuiButtonEmpty data-test-subj="backButton" onClick={() => {}}>
          {i18n.translate('xpack.triggersActionsUI.sections.actionConnectorAdd.backButtonLabel', {
            defaultMessage: 'Back',
          })}
        </EuiButtonEmpty>
      )}
    </EuiFlexItem>
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

  const onFormSubmit: FormConfig<ConnectorFormData>['onSubmit'] = async (data, isValid) => {
    console.log('Form data:', data);
  };

  const { form } = useForm({ onSubmit: onFormSubmit });
  // const [{ actionTypeId }] = useFormData({ form, watch: 'actionTypeId' });
  const [{ actionTypeId }] = useFormData({ form, watch: ['actionTypeId'] });

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{'Test'}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        banner={
          !actionTypeId && hasActionsUpgradeableByTrial ? (
            <UpgradeYourLicenseCallOut http={http} />
          ) : null
        }
      >
        <Form form={form}>
          <UseField<string | null> path="actionTypeId" defaultValue={null}>
            {(field) => {
              const { setValue } = field;
              if (actionTypeId != null) {
                return null;
              }

              return (
                <ActionTypeMenu
                  onActionTypeChange={(actionType: ActionType) => setValue(actionType.id)}
                  setHasActionsUpgradeableByTrial={setHasActionsUpgradeableByTrial}
                  actionTypeRegistry={actionTypeRegistry}
                />
              );
            }}
          </UseField>
          {actionTypeId != null ? <CreateConnectorForm /> : null}
        </Form>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <CancelBackButton
              buttonType={actionTypeId == null ? 'cancel' : 'back'}
              closeFlyout={onClose}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup justifyContent="spaceBetween">
              <SaveButton
                isSaving={false}
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
