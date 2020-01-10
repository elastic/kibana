/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface BaseWatchUpstreamJson {
  id: string;
  name: string;
  type: string;
  isNew: boolean;
  actions: any[];
}

export interface BaseWatchConfig {
  id?: string;
  type?: string;
  index?: string;
  timeField?: string;
  timeFields?: string;
  triggerIntervalSize?: number;
  triggerIntervalUnit?: string;
  aggType?: string;
  aggField?: string;
  termField?: string;
  termSize?: number;
  thresholdComparator?: string;
  timeWindowSize?: number;
  timeWindowUnit?: string;
  threshold?: number;
  groupBy?: string;
}

export declare class BaseWatch {
  constructor(props: BaseWatchConfig);
  updateWatchStatus(watchStatus: any): void;
  createAction(type: any, defaults: any): void;
  deleteAction(action: any): void;
  resetActions(): void;
  displayName: any;
  searchValue: any;
  typeName: any;
  iconClass: any;
  selectMessage: any;
  selectSortOrder: any;
  upstreamJson: BaseWatchUpstreamJson;
  isEqualTo(otherWatch: any): boolean;
}
