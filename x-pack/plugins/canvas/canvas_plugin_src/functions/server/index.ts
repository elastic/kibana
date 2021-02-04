/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { demodata } from './demodata';
import { escount } from './escount';
import { esdocs } from './esdocs';
import { pointseries } from './pointseries';
import { essql } from './essql';

export const functions = [demodata, esdocs, escount, essql, pointseries];
