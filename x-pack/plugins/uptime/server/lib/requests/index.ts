/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCerts } from './get_certs';
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
import { getJourneyDetails } from './get_journey_details';
import { getNetworkEvents } from './get_network_events';
import { getJourneyFailedSteps } from './get_journey_failed_steps';
import { getLastSuccessfulCheck } from './get_last_successful_check';
import { getJourneyScreenshotBlocks } from './get_journey_screenshot_blocks';
import { getSyntheticsMonitor } from './get_monitor';

export const requests = {
  getCerts,
  getIndexPattern,
  getLatestMonitor,
  getMonitorAvailability,
  getSyntheticsMonitor,
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

export type UptimeRequests = typeof requests;
