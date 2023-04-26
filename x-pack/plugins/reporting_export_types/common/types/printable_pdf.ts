/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JobParamsPDFDeprecated } from '@kbn/reporting-plugin/server/routes/lib';

// Job params: structure of incoming user request data, after being parsed from RISON

/**
 * @deprecated
 */
export type JobAppParamsPDF = Omit<JobParamsPDFDeprecated, 'browserTimezone' | 'version'>;
