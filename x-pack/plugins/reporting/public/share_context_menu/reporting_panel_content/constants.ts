/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Based on {@link URL_MAX_LENGTH} exported from core/public.
 */
const CHROMIUM_MAX_URL_LENGTH = 25 * 1000;

export const getMaxUrlLength = () => CHROMIUM_MAX_URL_LENGTH;
