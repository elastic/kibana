/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * the plugin (defined in `plugin.tsx`) has many dependencies that can be loaded only when the app is being used.
 * By loading these later we can reduce the initial bundle size and allow users to delay loading these dependencies until they are needed.
 */

import { Cases } from './cases';
import { Detections } from './detections';
import { Exceptions } from './exceptions';

import { Hosts } from './hosts';
import { Users } from './users';
import { Network } from './network';
import { Overview } from './overview';
import { Rules } from './rules';

import { Timelines } from './timelines';
import { Management } from './management';

/**
 * The classes used to instantiate the sub plugins. These are grouped into a single object for the sake of bundling them in a single dynamic import.
 */
const subPluginClasses = {
  Detections,
  Cases,
  Exceptions,
  Hosts,
  Users,
  Network,

  Overview,
  Rules,
  Timelines,
  Management,
};
export { subPluginClasses };
