/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ITelemetryClient } from '../../../services/telemetry/types';

const noop = () => {};

export const useSloOverviewFlyoutTelemetry = (telemetry: ITelemetryClient, location?: string) => {
  return useMemo(() => {
    if (!location) {
      return {
        reportViewed: noop,
        reportServiceNameClicked: noop,
        reportSloLinkClicked: noop,
        reportAlertClicked: noop,
        reportSearchQueried: noop as (searchQuery: string) => void,
        reportStatusFiltered: noop as (statuses: string[]) => void,
        reportSloClicked: noop,
      };
    }

    return {
      reportViewed: () => telemetry.reportSloOverviewFlyoutViewed({ location }),
      reportServiceNameClicked: () =>
        telemetry.reportSloOverviewFlyoutServiceNameClicked({ location }),
      reportSloLinkClicked: () => telemetry.reportSloOverviewFlyoutSloLinkClicked({ location }),
      reportAlertClicked: () => telemetry.reportSloOverviewFlyoutAlertClicked({ location }),
      reportSearchQueried: (searchQuery: string) =>
        telemetry.reportSloOverviewFlyoutSearchQueried({ location, searchQuery }),
      reportStatusFiltered: (statuses: string[]) =>
        telemetry.reportSloOverviewFlyoutStatusFiltered({ location, statuses }),
      reportSloClicked: () => telemetry.reportSloOverviewFlyoutSloClicked({ location }),
    };
  }, [telemetry, location]);
};
