/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import rison from 'rison-node';

// @ts-ignore
import { fromExpression } from '@kbn/interpreter/common';
import chrome from 'ui/chrome';
import { TimeRange } from 'ui/visualize';
import { ExecuteActionContext } from '../../../../../src/legacy/core_plugins/embeddable_api/public';
// @ts-ignore
import { interpretAst } from '../../interpreter/public/interpreter';
import { DASHBOARD_DRILLDOWN_ACTION } from './dashboard_drilldown_action_factory';
import { DynamicAction, ActionSavedObject } from '../dynamic_actions';

interface PartialParsedConfig {
  dashboardId?: string;
  addDynamicFilters?: boolean;
  staticQuery?: string;
  useDynamicTimeRange?: boolean;
  inNewTab?: boolean;
  staticTimeRange?: TimeRange;
}

export interface ParsedConfig {
  dashboardId: string;
  addDynamicFilters: boolean;
  staticQuery?: string;
  useDynamicTimeRange: boolean;
  inNewTab: boolean;
  staticTimeRange?: TimeRange;
}

export function getUpdatedConfiguration(
  config: string,
  {
    dashboardId,
    addDynamicFilters,
    staticQuery,
    useDynamicTimeRange,
    inNewTab,
    staticTimeRange,
  }: PartialParsedConfig
) {
  const existingParams = JSON.parse(config);
  if (dashboardId) {
    existingParams.dashboardId = dashboardId;
  }

  if (addDynamicFilters) {
    existingParams.addDynamicFilters = addDynamicFilters;
  }

  if (staticQuery) {
    existingParams.staticQuery = staticQuery;
  }

  if (useDynamicTimeRange) {
    existingParams.useDynamicTimeRange = useDynamicTimeRange;
  }

  if (inNewTab) {
    existingParams.inNewTab = inNewTab;
  }

  if (staticTimeRange) {
    existingParams.staticTimeRange = staticTimeRange;
  }

  return JSON.stringify(existingParams);
}

export class DashboardDrilldownAction extends DynamicAction {
  public dashboardId: string = '';
  public inNewTab: boolean = false;
  public addDynamicFilters: boolean = false;
  public staticQuery?: string;
  public useDynamicTimeRange: boolean = false;
  public staticTimeRange?: TimeRange;

  constructor(actionSavedObject?: ActionSavedObject) {
    super({
      actionSavedObject,
      type: DASHBOARD_DRILLDOWN_ACTION,
    });

    if (actionSavedObject && actionSavedObject.attributes.configuration !== '') {
      this.updateConfiguration(actionSavedObject.attributes.configuration);
    }
  }

  public updateConfiguration(config: string) {
    const {
      dashboardId,
      addDynamicFilters,
      staticQuery,
      useDynamicTimeRange,
      inNewTab,
      staticTimeRange,
    } = JSON.parse(config);
    this.dashboardId = dashboardId;
    this.staticTimeRange = staticTimeRange;
    this.useDynamicTimeRange = useDynamicTimeRange;
    this.addDynamicFilters = addDynamicFilters;
    this.staticQuery = staticQuery;
    this.inNewTab = inNewTab;
  }

  public getConfiguration() {
    return JSON.stringify({
      inNewTab: this.inNewTab,
      dashboardId: this.dashboardId,
      addDynamicFilters: this.addDynamicFilters,
      staticQuery: this.staticQuery,
      useDynamicTimeRange: this.useDynamicTimeRange,
      staticTimeRange: this.staticTimeRange,
    });
  }

  public execute({ embeddable, triggerContext }: ExecuteActionContext) {
    const query: { [key: string]: string } = {};
    if (this.addDynamicFilters) {
      query.addFilters = rison.encode(triggerContext.filters);
    }

    if (this.staticQuery) {
      query.staticQuery = rison.encode(this.staticQuery);
    }

    if (this.staticTimeRange) {
      query.timeRange = rison.encode(this.staticTimeRange);
    }

    const basePath = chrome.getBasePath();

    const queryStr = Object.keys(query)
      .map(key => `${key}=${query[key]}`)
      .join('&');
    const url = `${basePath}/app/kibana#/dashboard/${this.dashboardId}?${queryStr}`;
    window.open(url, this.inNewTab ? '_blank' : '');
  }
}
