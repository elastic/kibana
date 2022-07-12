/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { ActionGroup } from '@kbn/alerting-plugin/common';
import { OmitMessageVariablesType } from '../../lib/action_variables';

export interface ActionGroupWithMessageVariables extends ActionGroup<string> {
  omitMessageVariables?: OmitMessageVariablesType;
  defaultActionMessage?: string;
}

export interface ActionAccordionFormProps {
  actions: string[];
}

const ResponseActionForm = ({
  actions = ['test1', 'test2'],
}: // defaultActionGroupId,
// setActionIdByIndex,
// setActionGroupIdByIndex,
// setActions,
// setActionParamsProperty,
// actionTypes,
// messageVariables,
// actionGroups,
// defaultActionMessage,
// setHasActionsDisabled,
// setHasActionsWithBrokenConnector,
// actionTypeRegistry,
// getDefaultActionParams,
// isActionGroupDisabledForActionType,
ActionAccordionFormProps) => {
  // function a

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
      {actions.map((actionItem: string, index: number) => {
        return <form>{actionItem}</form>;
      })}
      <EuiSpacer size="m" />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ResponseActionForm as default };
