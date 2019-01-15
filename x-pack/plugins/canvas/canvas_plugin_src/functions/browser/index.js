/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functions as commonFunctions } from '../common';
import { browser } from './browser';
import { location } from './location';
import { markdown } from './markdown';
import { urlparam } from './urlparam';

export const functions = [browser, location, markdown, urlparam, ...commonFunctions];
