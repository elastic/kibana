/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, AlertInstanceState } from '../../../alerting/server';
import { alertsMock } from '../../../alerting/server/mocks';
import { LifecycleAlertServices } from './create_lifecycle_rule_type_factory';

class X<
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
> {
  create() {
    return alertsMock.createAlertServices<InstanceState, InstanceContext>();
  }
}

type Y<
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
> = ReturnType<X<InstanceState, InstanceContext>['create']>;

export const createLifecycleAlertServicesMock = <
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext,
  ActionGroupIds extends string = string
>(
  alertServices: Y<InstanceState, InstanceContext>
): LifecycleAlertServices<InstanceState, InstanceContext, ActionGroupIds> => ({
  alertWithLifecycle: ({ id }) => alertServices.alertInstanceFactory(id),
});
