/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ProcessorEvent } from '@kbn/observability-plugin/common';
import { rangeQuery } from '@kbn/observability-plugin/server';
import type { CommonCorrelationsQueryParams } from '../../../../common/correlations/types';
import { INFRA_FIELD_CANDIDATES } from '../../../../common/correlations/constants';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import type { DurationFieldCandidatesResponse } from './fetch_duration_field_candidates';

export async function fetchInfraFieldCandidates({
  apmEventClient,
  eventType,
  start,
  end,
}: CommonCorrelationsQueryParams & {
  query: estypes.QueryDslQueryContainer;
  apmEventClient: APMEventClient;
  eventType: ProcessorEvent;
}): Promise<DurationFieldCandidatesResponse> {
  const respMapping = await apmEventClient.fieldCaps('get_infra_field_caps', {
    apm: {
      events: [eventType],
    },
    fields: [...INFRA_FIELD_CANDIDATES],
    filters: '-metadata,-parent',
    include_empty_fields: false,
    index_filter: rangeQuery(start, end)[0],
  });

  return {
    fieldCandidates: Object.keys(respMapping.fields).filter((fieldName) =>
      INFRA_FIELD_CANDIDATES.has(fieldName)
    ),
  };
}
