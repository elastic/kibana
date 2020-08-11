/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Detections } from './detections';
import { Cases } from './cases';
import { Hosts } from './hosts';
import { Network } from './network';
import { Overview } from './overview';
import { Timelines } from './timelines';
import { Management } from './management';

const detectionsSubPlugin = new Detections();
const casesSubPlugin = new Cases();
const hostsSubPlugin = new Hosts();
const networkSubPlugin = new Network();
const overviewSubPlugin = new Overview();
const timelinesSubPlugin = new Timelines();
const managementSubPlugin = new Management();

export {
  detectionsSubPlugin,
  casesSubPlugin,
  hostsSubPlugin,
  networkSubPlugin,
  overviewSubPlugin,
  timelinesSubPlugin,
  managementSubPlugin,
};
