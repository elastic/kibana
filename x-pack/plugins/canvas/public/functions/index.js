/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functions as commonFunctions } from '../../canvas_plugin_src/functions/common';
import { browser } from './browser';
import { location } from './location';
import { markdown } from './markdown';
import { urlparam } from './urlparam';
import { asset } from './asset';
import { filters } from './filters';
import { timelion } from './timelion';

export const clientFunctions = [
  asset,
  filters,
  timelion,
  browser,
  location,
  markdown,
  urlparam,
  ...commonFunctions,
];
