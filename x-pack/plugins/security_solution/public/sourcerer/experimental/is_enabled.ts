/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Allows toggling between sourcerer implementations in runtime. Simply set the value in local storage
 * to:
 * - display the experimental component instead of the stable one
 * - use experimental data views hook instead of the stable one
 */
export const isExperimentalSourcererEnabled = () =>
  !!window.localStorage.getItem('EXPERIMENTAL_SOURCERER_ENABLED');
