/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { functions as commonFunctions } from '../common';
import { functions as externalFunctions } from '../external';
import { functions as browserFunctions } from './functions';

export const functions = [...browserFunctions, ...commonFunctions, ...externalFunctions];
