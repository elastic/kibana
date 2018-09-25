/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { browser } from '../../../../../../src/core_plugins/interpreter/public/functions/browser';
import { location } from '../../../../../../src/core_plugins/interpreter/public/functions/location';
import { urlparam } from '../../../../../../src/core_plugins/interpreter/public/functions/urlparam';
import { markdown } from './markdown';

export const functions = [browser, location, urlparam, markdown];
