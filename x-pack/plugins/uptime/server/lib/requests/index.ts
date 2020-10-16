/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCerts } from './get_certs';
import { getFilterBar } from './get_filter_bar';
import { getUptimeIndexPattern as getIndexPattern } from './get_index_pattern';
import { getLatestMonitor } from './get_latest_monitor';
import { getMonitorAvailability } from './get_monitor_availability';
import { getMonitorDurationChart } from './get_monitor_duration';
import { getMonitorDetails } from './get_monitor_details';
import { getMonitorLocations } from './get_monitor_locations';
import { getMonitorStates } from './get_monitor_states';
import { getMonitorStatus } from './get_monitor_status';
import { getPings } from './get_pings';
import { getPingHistogram } from './get_ping_histogram';
import { getSnapshotCount } from './get_snapshot_counts';
import { getIndexStatus } from './get_index_status';
import { getJourneySteps } from './get_journey_steps';
import { getJourneyScreenshot } from './get_journey_screenshot';

export const requests = {
  getCerts,
  getFilterBar,
  getIndexPattern,
  getLatestMonitor,
  getMonitorAvailability,
  getMonitorDurationChart,
  getMonitorDetails,
  getMonitorLocations,
  getMonitorStates,
  getMonitorStatus,
  getPings,
  getPingHistogram,
  getSnapshotCount,
  getIndexStatus,
  getJourneySteps,
  getJourneyScreenshot,
};

export type UptimeRequests = typeof requests;
