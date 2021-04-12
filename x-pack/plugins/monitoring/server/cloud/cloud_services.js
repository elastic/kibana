/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AWS } from './aws';
import { AZURE } from './azure';
import { GCP } from './gcp';

/**
 * An iteratable that can be used to loop across all known cloud services to detect them.
 *
 * @type {Array}
 */
export const CLOUD_SERVICES = [AWS, GCP, AZURE];
