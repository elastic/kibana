/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { UIM_APP_NAME } from '../../constants';

class UiMetricService {
  public track: any = () => {};

  public init = (track: any): void => {
    this.track = track;
  };

  public trackUiMetric = (actionType: string): any => {
    return this.track(UIM_APP_NAME, actionType);
  };
}

export const uiMetricService = new UiMetricService();
