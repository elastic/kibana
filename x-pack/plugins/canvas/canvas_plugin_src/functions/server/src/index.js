/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { demodata } from './demodata/index';
import { escount } from './escount';
import { esdocs } from '../../../../../../src/core_plugins/interpreter/server/functions/esdocs/index';
import { pointseries } from './pointseries/index';
import { server } from './server';
import { timelion } from '../../../../../../src/core_plugins/interpreter/server/functions/timelion';
import { essql } from './essql/index';

export const functions = [demodata, esdocs, escount, essql, pointseries, server, timelion];
