/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';

import { getEventEnrichmentComplete } from './api';

const getEventEnrichmentCompleteWithOptionalSignal = withOptionalSignal(getEventEnrichmentComplete);

export const useEventEnrichmentComplete = () =>
  useObservable(getEventEnrichmentCompleteWithOptionalSignal);
