/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore this file is too large for TypeScript, so it is excluded from our project config
import ecommerceSavedObjects from './ecommerce_saved_objects.json';
// @ts-ignore this file is too large for TypeScript, so it is excluded from our project config
import flightsSavedObjects from './flights_saved_objects.json';
// @ts-ignore this file is too large for TypeScript, so it is excluded from our project config
import webLogsSavedObjects from './web_logs_saved_objects.json';
import { loadSampleData } from './load_sample_data';

export { loadSampleData, ecommerceSavedObjects, flightsSavedObjects, webLogsSavedObjects };
