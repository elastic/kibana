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
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../triggers_actions_ui/public/types';

interface AlertPopoverConfigureNewActionProps {
  actionTypeId: string;
  actionId: string;
  cancel: () => void;
  done: (alert: CommonBaseAlert) => void;
}
export const AlertPopoverConfigureNewAction: React.FC<AlertPopoverConfigureNewActionProps> = (
  props: AlertPopoverConfigureNewActionProps
) => {
  const { actionTypeId, actionId, cancel, done } = props;
  const context = React.useContext(AlertPopoverContext);

  const [isAdding, setIsAdding] = React.useState(false);
  const [params, setParams] = React.useState(
    context.defaultParametersByAlertType[context.alert.type][actionTypeId]
  );

  async function addAction() {
    setIsAdding(true);
    let alert;
    try {
      alert = await Legacy.shims.kfetch({
        method: 'PUT',
        pathname: `/api/monitoring/v1/alert/${context.alert.type}`,
        body: JSON.stringify({
          action: {
            id: actionId,
            actionTypeId,
            group: 'default',
            params,
          },
        }),
      });
    } catch (err) {
      Legacy.shims.toastNotifications.addDanger({
        title: 'Error adding action',
        text: err.message,
      });
    }
    setIsAdding(false);
    done(alert);
  }

  const ParamsFieldsComponent = getParamsFieldsComponent(actionTypeId);
  if (!ParamsFieldsComponent) {
    return null;
  }
  const actionErrors: {
    errors: IErrorObject;
  } = Legacy.shims.triggersActionsUi.actionTypeRegistry.get(actionTypeId)?.validateParams(params);

  let disableButton = isAdding;
  if (!disableButton) {
    for (const errorList of Object.values(actionErrors.errors)) {
      if (errorList.length) {
        disableButton = true;
        break;
      }
    }
  }

  return (
    <EuiOverlayMask>
      <EuiModal onClose={cancel} initialFocus="[name=popswitch]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>Add {actionTypeId}</EuiModalHeaderTitle>
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
              actionParams={params as any}
              errors={actionErrors.errors}
              editAction={(field: string, value: string) =>
                setParams({
                  ...params,
                  [field]: value,
                })
              }
              messageVariables={[]}
              defaultMessage={undefined}
            />
          </Suspense>
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={cancel}>Cancel</EuiButtonEmpty>
          <EuiButton onClick={addAction} fill isDisabled={disableButton}>
            {isAdding ? 'Saving...' : 'Save'}
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};
