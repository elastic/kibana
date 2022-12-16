/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from 'lodash';
import { ActionsCompletion } from '../types';
import { ActionsConfigMap } from './get_actions_config_map';
import { SearchMetrics } from './types';

interface State {
  numSearches: number;
  totalSearchDurationMs: number;
  esSearchDurationMs: number;
  numberOfTriggeredActions: number;
  numberOfGeneratedActions: number;
  numberOfActiveAlerts: number;
  numberOfRecoveredAlerts: number;
  numberOfNewAlerts: number;
  hasReachedAlertLimit: boolean;
  connectorTypes: {
    [key: string]: {
      triggeredActionsStatus: ActionsCompletion;
      numberOfTriggeredActions: number;
      numberOfGeneratedActions: number;
    };
  };
}

export type RuleRunMetrics = Omit<State, 'connectorTypes'> & {
  triggeredActionsStatus: ActionsCompletion;
};
export class RuleRunMetricsStore {
  private state: State = {
    numSearches: 0,
    totalSearchDurationMs: 0,
    esSearchDurationMs: 0,
    numberOfTriggeredActions: 0,
    numberOfGeneratedActions: 0,
    numberOfActiveAlerts: 0,
    numberOfRecoveredAlerts: 0,
    numberOfNewAlerts: 0,
    hasReachedAlertLimit: false,
    connectorTypes: {},
  };

  // Getters
  public getTriggeredActionsStatus = () => {
    const hasPartial = Object.values(this.state.connectorTypes).some(
      (connectorType) => connectorType?.triggeredActionsStatus === ActionsCompletion.PARTIAL
    );
    return hasPartial ? ActionsCompletion.PARTIAL : ActionsCompletion.COMPLETE;
  };
  public getNumSearches = () => {
    return this.state.numSearches;
  };
  public getTotalSearchDurationMs = () => {
    return this.state.totalSearchDurationMs;
  };
  public getEsSearchDurationMs = () => {
    return this.state.esSearchDurationMs;
  };
  public getNumberOfTriggeredActions = () => {
    return this.state.numberOfTriggeredActions;
  };
  public getNumberOfGeneratedActions = () => {
    return this.state.numberOfGeneratedActions;
  };
  public getNumberOfActiveAlerts = () => {
    return this.state.numberOfActiveAlerts;
  };
  public getNumberOfRecoveredAlerts = () => {
    return this.state.numberOfRecoveredAlerts;
  };
  public getNumberOfNewAlerts = () => {
    return this.state.numberOfNewAlerts;
  };
  public getStatusByConnectorType = (actionTypeId: string) => {
    return this.state.connectorTypes[actionTypeId];
  };
  public getMetrics = (): RuleRunMetrics => {
    const { connectorTypes, ...metrics } = this.state;
    return {
      ...metrics,
      triggeredActionsStatus: this.getTriggeredActionsStatus(),
    };
  };
  public getHasReachedAlertLimit = () => {
    return this.state.hasReachedAlertLimit;
  };

  // Setters
  public setSearchMetrics = (searchMetrics: SearchMetrics[]) => {
    for (const metric of searchMetrics) {
      this.incrementNumSearches(metric.numSearches ?? 0);
      this.incrementTotalSearchDurationMs(metric.totalSearchDurationMs ?? 0);
      this.incrementEsSearchDurationMs(metric.esSearchDurationMs ?? 0);
    }
  };
  public setNumSearches = (numSearches: number) => {
    this.state.numSearches = numSearches;
  };
  public setTotalSearchDurationMs = (totalSearchDurationMs: number) => {
    this.state.totalSearchDurationMs = totalSearchDurationMs;
  };
  public setEsSearchDurationMs = (esSearchDurationMs: number) => {
    this.state.esSearchDurationMs = esSearchDurationMs;
  };
  public setNumberOfTriggeredActions = (numberOfTriggeredActions: number) => {
    this.state.numberOfTriggeredActions = numberOfTriggeredActions;
  };
  public setNumberOfGeneratedActions = (numberOfGeneratedActions: number) => {
    this.state.numberOfGeneratedActions = numberOfGeneratedActions;
  };
  public setNumberOfActiveAlerts = (numberOfActiveAlerts: number) => {
    this.state.numberOfActiveAlerts = numberOfActiveAlerts;
  };
  public setNumberOfRecoveredAlerts = (numberOfRecoveredAlerts: number) => {
    this.state.numberOfRecoveredAlerts = numberOfRecoveredAlerts;
  };
  public setNumberOfNewAlerts = (numberOfNewAlerts: number) => {
    this.state.numberOfNewAlerts = numberOfNewAlerts;
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
  public setHasReachedAlertLimit = (hasReachedAlertLimit: boolean) => {
    this.state.hasReachedAlertLimit = hasReachedAlertLimit;
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
  public incrementNumSearches = (incrementBy: number) => {
    this.state.numSearches += incrementBy;
  };
  public incrementTotalSearchDurationMs = (incrementBy: number) => {
    this.state.totalSearchDurationMs += incrementBy;
  };
  public incrementEsSearchDurationMs = (incrementBy: number) => {
    this.state.esSearchDurationMs += incrementBy;
  };
  public incrementNumberOfTriggeredActions = () => {
    this.state.numberOfTriggeredActions++;
  };
  public incrementNumberOfGeneratedActions = (incrementBy: number) => {
    this.state.numberOfGeneratedActions += incrementBy;
  };
  public incrementNumberOfTriggeredActionsByConnectorType = (actionTypeId: string) => {
    const currentVal = this.state.connectorTypes[actionTypeId]?.numberOfTriggeredActions || 0;
    set(this.state, `connectorTypes["${actionTypeId}"].numberOfTriggeredActions`, currentVal + 1);
  };
  public incrementNumberOfGeneratedActionsByConnectorType = (actionTypeId: string) => {
    const currentVal = this.state.connectorTypes[actionTypeId]?.numberOfGeneratedActions || 0;
    set(this.state, `connectorTypes["${actionTypeId}"].numberOfGeneratedActions`, currentVal + 1);
  };
}
