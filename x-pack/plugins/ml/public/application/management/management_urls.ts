/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type Path = string;

export const MANAGEMENT_PATH: Path = '/management';
export const ML_PATH: Path = `${MANAGEMENT_PATH}/ml`;
export const JOBS_LIST_PATH: Path = `${ML_PATH}/jobs_list`;
