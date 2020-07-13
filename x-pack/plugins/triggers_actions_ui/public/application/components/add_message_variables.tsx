/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPopover, EuiButtonIcon, EuiContextMenuPanel, EuiContextMenuItem } from '@elastic/eui';
import './add_message_variables.scss';

interface Props {
  messageVariables: string[] | undefined;
  paramsProperty: string;
  onSelectEventHandler: (variable: string) => void;
}

export const AddMessageVariables: React.FunctionComponent<Props> = ({
  messageVariables,
  paramsProperty,
  onSelectEventHandler,
}) => {
  const [isVariablesPopoverOpen, setIsVariablesPopoverOpen] = useState<boolean>(false);

  const getMessageVariables = () =>
    messageVariables?.map((variable: string, i: number) => (
      <EuiContextMenuItem
        key={variable}
        data-test-subj={`variableMenuButton-${i}`}
        icon="empty"
        onClick={() => {
          onSelectEventHandler(variable);
          setIsVariablesPopoverOpen(false);
        }}
      >
        {`{{${variable}}}`}
      </EuiContextMenuItem>
    ));

  const addVariableButtonTitle = i18n.translate(
    'xpack.triggersActionsUI.components.addMessageVariables.addVariableTitle',
    {
      defaultMessage: 'Add alert variable',
    }
  );

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          id={`${paramsProperty}AddVariableButton`}
          data-test-subj={`${paramsProperty}AddVariableButton`}
          title={addVariableButtonTitle}
          onClick={() => setIsVariablesPopoverOpen(true)}
          iconType="indexOpen"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.components.addMessageVariables.addVariablePopoverButton',
            {
              defaultMessage: 'Add variable',
            }
          )}
        />
      }
      isOpen={isVariablesPopoverOpen}
      closePopover={() => setIsVariablesPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel className="messageVariablesPanel" items={getMessageVariables()} />
    </EuiPopover>
  );
};
