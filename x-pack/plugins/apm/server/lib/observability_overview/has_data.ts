/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '../../../common/processor_event';
import { withApmSpan } from '../../utils/with_apm_span';
import { Setup } from '../helpers/setup_request';

export function getHasData({ setup }: { setup: Setup }) {
  return withApmSpan('observability_overview_has_apm_data', async () => {
    const { apmEventClient } = setup;
    try {
      const params = {
        apm: {
          events: [
            ProcessorEvent.transaction,
            ProcessorEvent.error,
            ProcessorEvent.metric,
          ],
        },
        terminateAfter: 1,
        body: {
          size: 0,
        },
      };

      const response = await apmEventClient.search(params);
      return {
        hasData: response.hits.total.value > 0,
        indices: setup.indices,
      };
    } catch (e) {
      return {
        hasData: false,
        indices: setup.indices,
      };
    }
  });
}
