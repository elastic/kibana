/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { ListItems } from './types';
import { MlJobsDescription } from '../ml_jobs_description';

export const buildMlJobsDescription = (jobIds: string[], label: string): ListItems => ({
  title: label,
  description: <MlJobsDescription jobIds={jobIds} />,
});
