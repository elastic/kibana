/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { asset } from './asset';
import { browser } from './browser';
import { filters } from './filters';
import { location } from './location';
import { markdown } from './markdown';
import { timelion } from './timelion';
import { urlparam } from './urlparam';
import { functions } from './common';

export const clientFunctions = [
  asset,
  browser,
  filters,
  location,
  markdown,
  timelion,
  urlparam,
  ...functions,
];
