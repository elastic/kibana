/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ViewRuleDetailsAlertAction } from './view_rule_details_alert_action';
import { MarkAsUntrackedAlertAction, ToggleAlertAction } from '../../../..';
import { DefaultRowActionsProps } from './types';
import { ViewAlertDetailsAlertAction } from './view_alert_details_alert_action';

export const DefaultRowActions = (props: DefaultRowActionsProps) => {
  return (
    <>
      <ViewRuleDetailsAlertAction {...props} />
      <ViewAlertDetailsAlertAction {...props} />
      <MarkAsUntrackedAlertAction {...props} />
      <ToggleAlertAction {...props} />
    </>
  );
};
