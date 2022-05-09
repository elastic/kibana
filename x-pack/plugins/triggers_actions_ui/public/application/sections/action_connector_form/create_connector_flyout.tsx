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
} from '@elastic/eui';
import {
  useForm,
  Form,
  FormConfig,
  UseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FormattedMessage } from '@kbn/i18n-react';

import { ActionType, ActionTypeRegistryContract } from '../../../types';
import { CreateConnectorForm } from './create_connector_form';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';
import { ActionTypeMenu } from './action_type_menu';

interface CreateConnectorFlyoutProps {
  actionTypeRegistry: ActionTypeRegistryContract;
  onClose: () => void;
}

interface ConnectorFormData {
  name: string;
  [key: string]: unknown;
}

const CreateConnectorFlyoutComponent: React.FC<CreateConnectorFlyoutProps> = ({
  actionTypeRegistry,
  onClose,
}) => {
  const {
    docLinks,
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
      <EuiFlyoutBody>
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
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  color="success"
                  data-test-subj="saveNewActionButton"
                  type="submit"
                  disabled={actionTypeId == null}
                  // isLoading={isSaving}
                  onClick={form.submit}
                >
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionConnectorAdd.saveButtonLabel"
                    defaultMessage="Save"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const CreateConnectorFlyout = memo(CreateConnectorFlyoutComponent);
