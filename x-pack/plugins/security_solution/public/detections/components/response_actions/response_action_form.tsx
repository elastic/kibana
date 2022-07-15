/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiTitle,
  EuiSpacer,
  EuiKeyPadMenuItem,
  EuiFlexItem,
  EuiToolTip,
  EuiIcon,
  EuiFlexGroup,
  EuiButton,
  EuiBetaBadge,
} from '@elastic/eui';
import { suspendedComponentWithProps } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { ResponseActionTypeForm } from './response_action_type_form';
import type { ResponseActionFormProps } from './get_response_action_form';
import type { ResponseActionType } from './get_supported_response_actions';
import { getSupportedResponseActions, responseActionTypes } from './get_supported_response_actions';
import { useOsqueryEnabled } from './useOsqueryEnabled';

export const ResponseActionForm = ({ items, addItem, removeItem }: ResponseActionFormProps) => {
  const [isAddResponseActionButtonShown, setAddResponseActionButtonShown] = useState(
    items.length > 0
  );

  const [supportedResponseActionTypes, setSupportedResponseActionTypes] = useState<
    ResponseActionType[] | undefined
  >();

  const isOsqueryEnabled = useOsqueryEnabled();

  useEffect(() => {
    const actionEnabledMap: Record<string, boolean> = {
      '.osquery': isOsqueryEnabled,
    };
    const supportedTypes = getSupportedResponseActions(responseActionTypes, actionEnabledMap);
    setSupportedResponseActionTypes(supportedTypes);
  }, [isOsqueryEnabled]);

  const addActionType = useCallback(() => {
    setAddResponseActionButtonShown(false);
    addItem();
  }, [addItem]);

  const onDeleteAction = useCallback(
    (id: number) => {
      removeItem(id);
    },
    [removeItem]
  );

  const renderAddResponseActionButton = useMemo(() => {
    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            data-test-subj="addAlertActionButton"
            onClick={() => setAddResponseActionButtonShown(false)}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.actionForm.addActionButtonLabel"
              defaultMessage="Add action"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, []);

  const renderResponseActionTypes = useMemo(() => {
    return (
      supportedResponseActionTypes?.length &&
      supportedResponseActionTypes.map(function (item, index) {
        const keyPadItem = (
          <EuiKeyPadMenuItem
            key={index}
            isDisabled={false}
            data-test-subj={`${item.id}-ActionTypeSelectOption`}
            label={item.name}
            onClick={addActionType}
          >
            <EuiIcon
              size="xl"
              type={
                typeof item.iconClass === 'string'
                  ? item.iconClass
                  : suspendedComponentWithProps(item.iconClass as React.ComponentType)
              }
            />
          </EuiKeyPadMenuItem>
        );

        return (
          <EuiFlexItem grow={false} key={`keypad-${item.id}`}>
            <EuiToolTip position="top" content={'test'}>
              {keyPadItem}
            </EuiToolTip>
          </EuiFlexItem>
        );
      })
    );
  }, [addActionType, supportedResponseActionTypes?.length]);

  if (!supportedResponseActionTypes?.length) return <></>;

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h4>
              <FormattedMessage
                defaultMessage="Response Actions"
                id="xpack.triggersActionsUI.sections.actionForm.responseActionSectionsTitle"
              />
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBetaBadge
            tooltipContent={i18n.translate('xpack.securitySolution.rules.experimentalTooltip', {
              defaultMessage:
                'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will take a best effort approach to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
            })}
            label={i18n.translate('xpack.securitySolution.rules.experimentalTitle', {
              defaultMessage: 'Technical preview',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {items.map((actionItem) => {
        return (
          <div key={actionItem.id}>
            <ResponseActionTypeForm
              item={actionItem}
              // updateAction={updateAction}
              onDeleteAction={onDeleteAction}
            />
          </div>
        );
      })}
      <EuiSpacer size="m" />

      {isAddResponseActionButtonShown ? renderAddResponseActionButton : renderResponseActionTypes}
      <EuiSpacer size="m" />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ResponseActionForm as default };
