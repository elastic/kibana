/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';

export const checkInFleetAgent = async (esClient: Client, agentId: string) => {
  const checkinNow = new Date().toISOString();

  await esClient.update({
    index: AGENTS_INDEX,
    id: agentId,
    refresh: 'wait_for',
    retry_on_conflict: 5,
    body: {
      doc: {
        active: true,
        last_checkin: checkinNow,
        updated_at: checkinNow,
      },
    },
  });
};
