/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCerts } from './get_certs';
import { getUptimeIndexPattern as getIndexPattern } from './get_index_pattern';
import { getIndexStatus } from './get_index_status';
import { getJourneyDetails } from './get_journey_details';
import { getJourneyFailedSteps } from './get_journey_failed_steps';
import { getJourneyScreenshot } from './get_journey_screenshot';
import { getJourneyScreenshotBlocks } from './get_journey_screenshot_blocks';
import { getJourneySteps } from './get_journey_steps';
import { getLastSuccessfulCheck } from './get_last_successful_check';
import { getLatestMonitor } from './get_latest_monitor';
import { getMonitorAvailability } from './get_monitor_availability';
import { getMonitorDetails } from './get_monitor_details';
import { getMonitorDurationChart } from './get_monitor_duration';
import { getMonitorLocations } from './get_monitor_locations';
import { getMonitorStates } from './get_monitor_states';
import { getMonitorStatus } from './get_monitor_status';
import { getNetworkEvents } from './get_network_events';
import { getPingHistogram } from './get_ping_histogram';
import { getPings } from './get_pings';
import { getSnapshotCount } from './get_snapshot_counts';

export const uptimeRequests = {
  getCerts,
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
  getJourneyFailedSteps,
  getLastSuccessfulCheck,
  getJourneyScreenshot,
  getJourneyScreenshotBlocks,
  getJourneyDetails,
  getNetworkEvents,
};

export type UptimeRequests = typeof uptimeRequests;
