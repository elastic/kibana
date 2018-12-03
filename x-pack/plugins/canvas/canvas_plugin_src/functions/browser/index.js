/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { browser } from './browser';
import { location } from './location';
import { urlparam } from './urlparam';
import { markdown } from './markdown';

export const functions = [browser, location, urlparam, markdown];
