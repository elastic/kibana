/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
} from '@elastic/eui';
import { suspendedComponentWithProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ResponseActionTypeForm } from './response_action_type_form';
import type { ResponseActionFormProps } from './get_response_action_form';

const supportedResponseActions = [
  { id: '.osquery', name: 'osquery', iconClass: 'logoOsquery' },
  // { id: '.endpointSecurity', name: 'endpointSecurity', iconClass: 'logoSecurity' },
];

export const ResponseActionForm = ({ items, addItem, removeItem }: ResponseActionFormProps) => {
  const [isAddResponseActionButtonShown, setAddResponseActionButtonShown] = useState(
    items.length > 0
  );
  const addActionType = useCallback(
    (actionTypeModel) => {
      const ID = Math.floor(Math.random() * 100);
      setAddResponseActionButtonShown(false);
      addItem();
      // setActions((prev) => [
      //   ...prev,
      //   {
      //     id: ID.toString(),
      //     actionTypeId: actionTypeModel.name,
      //     params: {},
      //   },
      // ]);
      // setActionIdByIndex(actionTypeConnectors[0].id, actions.length - 1);
    },
    [addItem]
  );

  const onDeleteAction = useCallback(
    (id: string) => {
      removeItem(id);
      // const updatedActions = actions.filter((item) => item.id !== id);
      //
      // setActions(updatedActions);
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
      supportedResponseActions?.length &&
      supportedResponseActions.map(function (item, index) {
        const keyPadItem = (
          <EuiKeyPadMenuItem
            key={index}
            isDisabled={false}
            data-test-subj={`${item.id}-ActionTypeSelectOption`}
            label={item.name}
            onClick={() => addActionType(item)}
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
  }, [addActionType]);

  return (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage
            defaultMessage="Response Actions"
            id="xpack.triggersActionsUI.sections.actionForm.responseActionSectionsTitle"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      {items.map((actionItem) => {
        return (
          <div key={actionItem.id}>
            <ResponseActionTypeForm
              action={actionItem}
              // updateAction={updateAction}
              onDeleteAction={onDeleteAction}
            />
          </div>
        );
      })}
      {isAddResponseActionButtonShown ? renderAddResponseActionButton : renderResponseActionTypes}
      <EuiSpacer size="m" />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ResponseActionForm as default };
