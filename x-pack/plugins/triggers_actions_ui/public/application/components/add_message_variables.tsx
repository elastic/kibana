/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import './add_message_variables.scss';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { templateActionVariable } from '../lib';

interface Props {
  buttonTitle?: string;
  messageVariables?: ActionVariable[];
  paramsProperty: string;
  onSelectEventHandler: (variable: ActionVariable) => void;
  showButtonTitle?: boolean;
}

export const AddMessageVariables: React.FunctionComponent<Props> = ({
  buttonTitle,
  messageVariables,
  paramsProperty,
  onSelectEventHandler,
  showButtonTitle = false,
}) => {
  const [isVariablesPopoverOpen, setIsVariablesPopoverOpen] = useState<boolean>(false);

  const getMessageVariables = () =>
    messageVariables?.map((variable: ActionVariable, i: number) => (
      <EuiContextMenuItem
        key={variable.name}
        data-test-subj={`variableMenuButton-${variable.name}`}
        icon="empty"
        disabled={variable.deprecated}
        onClick={() => {
          onSelectEventHandler(variable);
          setIsVariablesPopoverOpen(false);
        }}
      >
        <>
          <EuiText size="m" data-test-subj={`variableMenuButton-${i}-templated-name`}>
            {templateActionVariable(variable)}
          </EuiText>
          <EuiText size="m" color="subdued">
            <div>{variable.description}</div>
          </EuiText>
        </>
      </EuiContextMenuItem>
    ));

  const addVariableButtonTitle = buttonTitle
    ? buttonTitle
    : i18n.translate(
        'xpack.triggersActionsUI.components.addMessageVariables.addRuleVariableTitle',
        {
          defaultMessage: 'Add rule variable',
        }
      );

  const Button = useMemo(
    () =>
      showButtonTitle ? (
        <EuiButtonEmpty
          id={`${paramsProperty}AddVariableButton`}
          data-test-subj={`${paramsProperty}AddVariableButton-Title`}
          size="xs"
          onClick={() => setIsVariablesPopoverOpen(true)}
          iconType="indexOpen"
          aria-label={i18n.translate(
            'xpack.triggersActionsUI.components.addMessageVariables.addVariablePopoverButton',
            {
              defaultMessage: 'Add variable',
            }
          )}
        >
          {addVariableButtonTitle}
        </EuiButtonEmpty>
      ) : (
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
      ),
    [addVariableButtonTitle, paramsProperty, showButtonTitle]
  );
  if ((messageVariables?.length ?? 0) === 0) {
    return <></>;
  }

  return (
    <EuiPopover
      button={Button}
      isOpen={isVariablesPopoverOpen}
      closePopover={() => setIsVariablesPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel className="messageVariablesPanel" items={getMessageVariables()} />
    </EuiPopover>
  );
};
