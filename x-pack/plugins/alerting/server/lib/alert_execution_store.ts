/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsConfigMap } from './get_actions_config_map';
import { ActionsCompletion } from '../task_runner/types';

export class AlertExecutionStore {
  private numberOfTriggeredActions = 0;
  private numberOfScheduledActions = 0;
  private numberOfTriggeredActionsByConnectorType: {
    [key: string]: number;
  } = {};
  private triggeredActionsStatus: ActionsCompletion = ActionsCompletion.COMPLETE;

  public getNumberOfTriggeredActions = () => {
    return this.numberOfTriggeredActions;
  };
  public getNumberOfScheduledActions = () => {
    return this.numberOfScheduledActions;
  };
  public getNumberOfTriggeredActionsByConnectorType = (actionTypeId: string) => {
    return this.numberOfTriggeredActionsByConnectorType[actionTypeId];
  };
  public getTriggeredActionsStatus = () => {
    return this.triggeredActionsStatus;
  };

  public setNumberOfScheduledActions = (numberOfScheduledActions: number) => {
    this.numberOfScheduledActions = numberOfScheduledActions;
  };
  public setNumberOfTriggeredActions = (numberOfTriggeredActions: number) => {
    this.numberOfTriggeredActions = numberOfTriggeredActions;
  };
  public setNumberOfTriggeredActionsByConnectorType = ({
    actionTypeId,
    numberOfTriggeredActionsByConnectorType,
  }: {
    actionTypeId: string;
    numberOfTriggeredActionsByConnectorType: number;
  }) => {
    this.numberOfTriggeredActionsByConnectorType[actionTypeId] =
      numberOfTriggeredActionsByConnectorType;
  };
  public setTriggeredActionsStatus = (status: ActionsCompletion) => {
    return (this.triggeredActionsStatus = status);
  };

  public hasReachedTheExecutableActionsLimit = (actionsConfigMap: ActionsConfigMap): boolean =>
    this.numberOfTriggeredActions >= actionsConfigMap.default.max;

  public hasReachedTheExecutableActionsLimitByConnectorType = ({
    actionsConfigMap,
    actionTypeId,
  }: {
    actionsConfigMap: ActionsConfigMap;
    actionTypeId: string;
  }): boolean => {
    const numberOfTriggeredActionsByConnectorType =
      this.numberOfTriggeredActionsByConnectorType[actionTypeId] || 0;
    const executableActionsLimitByConnectorType =
      actionsConfigMap[actionTypeId]?.max || actionsConfigMap.default.max;

    return numberOfTriggeredActionsByConnectorType >= executableActionsLimitByConnectorType;
  };

  public incrementNumberOfTriggeredActions = () => {
    this.numberOfTriggeredActions++;
  };

  public incrementNumberOfScheduledActions = (incrementBy: number) => {
    this.numberOfScheduledActions += incrementBy;
  };

  public incrementNumberOfTriggeredActionsByConnectorType = (actionTypeId: string) => {
    this.numberOfTriggeredActionsByConnectorType[actionTypeId] =
      (this.numberOfTriggeredActionsByConnectorType[actionTypeId] || 0) + 1;
  };
}
