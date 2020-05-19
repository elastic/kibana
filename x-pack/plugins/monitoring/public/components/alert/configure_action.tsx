/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Suspense } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiButtonEmpty,
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { CommonBaseAlert } from '../../../common/types';
import { AlertPopoverContext, getParamsFieldsComponent } from './lib';
import { Legacy } from '../../legacy_shims';
import { AlertAction } from '../../../../alerting/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../triggers_actions_ui/public/types';

export interface AlertPopoverConfigureActionProps {
  action: AlertAction;
  editAction: (field: string, value: string) => void;
  cancel: () => void;
  done: (alert: CommonBaseAlert) => void;
}
export const AlertPopoverConfigureAction: React.FC<AlertPopoverConfigureActionProps> = (
  props: AlertPopoverConfigureActionProps
) => {
  const { action, editAction, cancel, done } = props;
  const context = React.useContext(AlertPopoverContext);

  const [isSaving, setIsSaving] = React.useState(false);

  async function saveAction() {
    setIsSaving(true);
    let alert;
    try {
      alert = await Legacy.shims.kfetch({
        method: 'PUT',
        pathname: `/api/monitoring/v1/alert/${context.alert.type}`,
        body: JSON.stringify({
          action,
        }),
      });
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: 'Error saving action',
        text: err.message,
      });
    }
    setIsSaving(false);
    done(alert);
  }

  const ParamsFieldsComponent = getParamsFieldsComponent(action.actionTypeId);
  if (!ParamsFieldsComponent) {
    return null;
  }
  const actionErrors: {
    errors: IErrorObject;
  } = Legacy.shims.triggersActionsUi.actionTypeRegistry
    .get(action.actionTypeId)
    ?.validateParams(action.params);

  return (
    <EuiOverlayMask>
      <EuiModal onClose={cancel} initialFocus="[name=popswitch]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>Configure {action.actionTypeId}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <Suspense
            fallback={
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          >
            <ParamsFieldsComponent
              index={0}
              actionParams={action.params as any}
              errors={actionErrors.errors}
              editAction={editAction}
              messageVariables={[]}
              defaultMessage={undefined}
            />
          </Suspense>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={cancel}>Cancel</EuiButtonEmpty>
          <EuiButton size="s" onClick={saveAction} fill isDisabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
