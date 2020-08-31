/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ActionComponentType, ControlSchema } from '../action_schema';
import { AssignmentActionType } from '../table';
import { ActionControl } from './action_control';
import { TagBadgeList } from './tag_badge_list';

interface ComponentProps extends ControlSchema {
  actionData?: {
    [key: string]: any;
  };
  disabled: boolean;
  actionHandler(action: AssignmentActionType, payload?: any): void;
}

export const OptionControl: React.FC<ComponentProps> = (props: ComponentProps) => {
  switch (props.type) {
    case ActionComponentType.Action:
      if (!props.action) {
        throw Error('Action cannot be undefined');
      }
      return (
        <ActionControl
          actionHandler={props.actionHandler}
          action={props.action}
          danger={props.danger}
          name={props.name}
          showWarning={props.showWarning}
          warningHeading={props.warningHeading}
          warningMessage={props.warningMessage}
          disabled={props.disabled}
        />
      );
    case ActionComponentType.TagBadgeList:
      if (!props.actionDataKey) {
        throw Error('actionDataKey cannot be undefined');
      }
      if (!props.actionData) {
        throw Error('actionData cannot be undefined');
      }
      return (
        <TagBadgeList
          actionHandler={props.actionHandler}
          action={props.action}
          name={props.name}
          items={props.actionData[props.actionDataKey]}
          disabled={props.disabled}
        />
      );
  }
  return <div>Invalid config</div>;
};
