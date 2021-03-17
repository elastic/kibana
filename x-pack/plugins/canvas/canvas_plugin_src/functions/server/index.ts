/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { demodata } from './demodata';
import { escountLegacy } from './escountLegacy';
import { esdocsLegacy } from './esdocsLegacy';
import { pointseries } from './pointseries';
import { essqlLegacy } from './essqlLegacy';

export const functions = [demodata, esdocsLegacy, escountLegacy, essqlLegacy, pointseries];
