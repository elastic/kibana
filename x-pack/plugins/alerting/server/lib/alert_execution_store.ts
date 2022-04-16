/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from 'lodash';
import { ActionsConfigMap } from './get_actions_config_map';
import { ActionsCompletion } from '../task_runner/types';

interface State {
  numberOfTriggeredActions: number;
  numberOfScheduledActions: number;
  connectorTypes: {
    [key: string]: {
      triggeredActionsStatus: ActionsCompletion;
      numberOfTriggeredActions: number;
      numberOfScheduledActions: number;
    };
  };
}

export class AlertExecutionStore {
  private state: State = {
    numberOfTriggeredActions: 0,
    numberOfScheduledActions: 0,
    connectorTypes: {},
  };

  // Getters
  public getTriggeredActionsStatus = () => {
    const hasPartial = Object.values(this.state.connectorTypes).some(
      (connectorType) => connectorType?.triggeredActionsStatus === ActionsCompletion.PARTIAL
    );
    return hasPartial ? ActionsCompletion.PARTIAL : ActionsCompletion.COMPLETE;
  };
  public getNumberOfTriggeredActions = () => {
    return this.state.numberOfTriggeredActions;
  };
  public getNumberOfScheduledActions = () => {
    return this.state.numberOfScheduledActions;
  };
  public getStatusByConnectorType = (actionTypeId: string) => {
    return this.state.connectorTypes[actionTypeId];
  };

  // Setters
  public setNumberOfTriggeredActions = (numberOfScheduledActions: number) => {
    this.state.numberOfTriggeredActions = numberOfScheduledActions;
  };

  public setNumberOfScheduledActions = (numberOfScheduledActions: number) => {
    this.state.numberOfScheduledActions = numberOfScheduledActions;
  };

  public setTriggeredActionsStatusByConnectorType = ({
    actionTypeId,
    status,
  }: {
    actionTypeId: string;
    status: ActionsCompletion;
  }) => {
    set(this.state, `connectorTypes["${actionTypeId}"].triggeredActionsStatus`, status);
  };

  // Checkers
  public hasReachedTheExecutableActionsLimit = (actionsConfigMap: ActionsConfigMap): boolean =>
    this.state.numberOfTriggeredActions >= actionsConfigMap.default.max;

  public hasReachedTheExecutableActionsLimitByConnectorType = ({
    actionsConfigMap,
    actionTypeId,
  }: {
    actionsConfigMap: ActionsConfigMap;
    actionTypeId: string;
  }): boolean => {
    const numberOfTriggeredActionsByConnectorType =
      this.state.connectorTypes[actionTypeId]?.numberOfTriggeredActions || 0;
    const executableActionsLimitByConnectorType =
      actionsConfigMap[actionTypeId]?.max || actionsConfigMap.default.max;

    return numberOfTriggeredActionsByConnectorType >= executableActionsLimitByConnectorType;
  };

  public hasConnectorTypeReachedTheLimit = (actionTypeId: string) =>
    this.state.connectorTypes[actionTypeId]?.triggeredActionsStatus === ActionsCompletion.PARTIAL;

  // Incrementer
  public incrementNumberOfTriggeredActions = () => {
    this.state.numberOfTriggeredActions++;
  };

  public incrementNumberOfScheduledActions = (incrementBy: number) => {
    this.state.numberOfScheduledActions += incrementBy;
  };

  public incrementNumberOfTriggeredActionsByConnectorType = (actionTypeId: string) => {
    const currentVal = this.state.connectorTypes[actionTypeId]?.numberOfTriggeredActions || 0;
    set(this.state, `connectorTypes["${actionTypeId}"].numberOfTriggeredActions`, currentVal + 1);
  };
  public incrementNumberOfScheduledActionsByConnectorType = (actionTypeId: string) => {
    const currentVal = this.state.connectorTypes[actionTypeId]?.numberOfScheduledActions || 0;
    set(this.state, `connectorTypes["${actionTypeId}"].numberOfScheduledActions`, currentVal + 1);
  };
}
