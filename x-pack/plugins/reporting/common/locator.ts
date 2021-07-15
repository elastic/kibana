/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition } from 'src/plugins/share/common';
import type { ManagementAppLocator } from 'src/plugins/management/common';

import { PLUGIN_ID } from './constants';

export const REPORT_LOCATOR_ID = 'REPORT_LOCATOR_ID';

type ReportingLocatorParams =
  | {
      page: 'redirect';
      payload: {
        jobId: string;
        locatorOffset: number;
      };
    }
  | {
      page: 'home';
    };

interface ReportingLocatorDependencies {
  managementLocator: ManagementAppLocator;
}

export class ReportingLocatorDefinition implements LocatorDefinition<ReportingLocatorParams> {
  constructor(private readonly deps: ReportingLocatorDependencies) {}

  public readonly id = REPORT_LOCATOR_ID;

  async getLocation(params: ReportingLocatorParams) {
    const location = await this.deps.managementLocator.getLocation({
      sectionId: 'insightsAndAlerting',
      appId: PLUGIN_ID,
    });

    switch (params.page) {
      case 'home':
        return location;
      case 'redirect':
        return {
          ...location,
          path:
            location.path +
            `/r?jobId=${params.payload.jobId}&locatorOffset=${params.payload.locatorOffset}`,
        };
      default:
        return location;
    }
  }
}
