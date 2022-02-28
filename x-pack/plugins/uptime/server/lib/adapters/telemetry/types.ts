/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PageViewParams {
  page: string;
  dateStart: string;
  dateEnd: string;
  autoRefreshEnabled: boolean;
  autorefreshInterval: number;
  refreshTelemetryHistory?: boolean;
  refreshEsData?: boolean;
}

export interface Stats {
  min_length: number;
  max_length: number;
  avg_length: number;
}

export interface Usage {
  last_24_hours: {
    hits: UptimeTelemetry;
  };
}

export interface UptimeTelemetry {
  overview_page: number;
  monitor_page: number;
  settings_page: number;
  no_of_unique_monitors: number;
  monitor_frequency: number[];
  no_of_unique_observer_locations: number;
  monitor_name_stats: Stats;
  observer_location_name_stats: Stats;

  dateRangeStart: string[];
  dateRangeEnd: string[];
  autorefreshInterval: number[];
  autoRefreshEnabled: boolean;

  fleet_no_of_unique_monitors: number;
  fleet_monitor_frequency: number[];
  fleet_monitor_name_stats: Stats;
}
