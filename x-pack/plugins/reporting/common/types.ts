/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_JOB_TYPES, ALL_REPORT_TYPES } from './constants';

type ReportTypeDeclaration = typeof ALL_REPORT_TYPES;
export type ReportTypes = ReportTypeDeclaration[keyof ReportTypeDeclaration];

type JobTypeDeclaration = typeof ALL_JOB_TYPES;
export type JobTypes = JobTypeDeclaration[keyof JobTypeDeclaration];
