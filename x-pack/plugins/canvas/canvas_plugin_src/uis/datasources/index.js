/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { essql } from './essql';
import { esdocs } from './esdocs';
import { demodata } from './demodata';
import { timelion } from './timelion';

export const datasourceSpecs = [essql, esdocs, demodata, timelion];
