/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';

import { getEventEnrichment } from './api';

// TODO define filtered version of getEventEnrichment that excludes incomplete responses
const getEventEnrichmentOptionalSignal = withOptionalSignal(getEventEnrichment);

export const useEventEnrichment = () => useObservable(getEventEnrichmentOptionalSignal);
