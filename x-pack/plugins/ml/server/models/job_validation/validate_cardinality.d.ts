/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';
import { CombinedJob } from '../../../common/types/anomaly_detection_jobs';

export function validateCardinality(callAsCurrentUser: APICaller, job: CombinedJob): any[];
