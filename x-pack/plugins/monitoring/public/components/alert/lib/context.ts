/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { CommonBaseAlert, CommonActionDefaultParameters } from '../../../../common/types';
import { ActionResult, ActionType } from '../../../../../actions/common';

interface AlertPopoverContextProps {
  alert: CommonBaseAlert;
  configuredActions: ActionResult[];
  validConnectorTypes: ActionType[];
  defaultParametersByAlertType: CommonActionDefaultParameters;
  addAction: (action: ActionResult) => void;
  updateThrottle: (throttle: string | null) => void;
}
export const AlertPopoverContext = React.createContext<AlertPopoverContextProps>({} as any);
