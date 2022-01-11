/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventHit, FetchEventsOptions } from '../../../signals/threat_mapping/types';
import { fetchItems as fetchEvents } from './fetch_items';

// todo: add searchAfter
export const fetchSourceEvents = async ({
  abortableEsClient,
  buildRuleMessage,
  exceptionItems,
  listClient,
  logger,
  perPage,
  filters,
  index,
  language,
  query,
}: Omit<FetchEventsOptions<EventHit>, 'transformHits'>) =>
  fetchEvents({
    buildRuleMessage,
    abortableEsClient,
    exceptionItems,
    index,
    language,
    listClient,
    logger,
    perPage,
    query,
    filters,
    transformHits: (hits) => hits,
  });
