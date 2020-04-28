/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NavTab } from '../../components/navigation/types';

export enum SiemPageName {
  overview = 'overview',
  hosts = 'hosts',
  network = 'network',
  detections = 'detections',
  timelines = 'timelines',
  case = 'case',
}

export type SiemNavTabKey =
  | SiemPageName.overview
  | SiemPageName.hosts
  | SiemPageName.network
  | SiemPageName.detections
  | SiemPageName.timelines
  | SiemPageName.case;

export type SiemNavTab = Record<SiemNavTabKey, NavTab>;
