/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertInstanceContext, AlertInstanceState } from '../../../alerting/server';
import { alertsMock } from '../../../alerting/server/mocks';
import { LifecycleAlertServices } from './create_lifecycle_executor';

/**
 * This wraps the alerts to enable the preservation of the generic type
 * arguments of the factory function.
 **/
class AlertsMockWrapper<
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
> {
  createAlertServices() {
    return alertsMock.createRuleExecutorServices<InstanceState, InstanceContext>();
  }
}

type AlertServices<
  InstanceState extends AlertInstanceState = AlertInstanceState,
  InstanceContext extends AlertInstanceContext = AlertInstanceContext
> = ReturnType<AlertsMockWrapper<InstanceState, InstanceContext>['createAlertServices']>;

export const createLifecycleAlertServicesMock = <
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
>(
  alertServices: AlertServices<InstanceState, InstanceContext>
): LifecycleAlertServices<InstanceState, InstanceContext, ActionGroupIds> => ({
  alertWithLifecycle: ({ id }) => alertServices.alertFactory.create(id),
  getAlertStartedDate: jest.fn((id: string) => null),
});
