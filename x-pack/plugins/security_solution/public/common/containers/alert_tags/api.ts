/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { DETECTION_ENGINE_ALERT_TAGS_URL } from '../../../../common/constants';
import type { AlertTags } from '../../../../common/api/detection_engine';
import { KibanaServices } from '../../lib/kibana';

export const setAlertTags = async ({
  tags,
  ids,
  signal,
}: {
  tags: AlertTags;
  ids: string[];
  signal: AbortSignal | undefined;
}): Promise<estypes.BulkResponse> => {
  return KibanaServices.get().http.fetch<estypes.BulkResponse>(DETECTION_ENGINE_ALERT_TAGS_URL, {
    method: 'POST',
    body: JSON.stringify({ tags, ids }),
    signal,
  });
};
