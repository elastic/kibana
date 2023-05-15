/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { CoreStart } from '@kbn/core/public';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AlertTags } from '../../../../../common/detection_engine/schemas/common';
import { DETECTION_ENGINE_ALERT_TAGS_URL } from '../../../../../common/constants';

/**
 * Update alert tags by query
 *
 * @param tags to add and/or remove from a batch of alerts
 * @param query optional query object to update alerts by query.

 *
 * @throws An error if response is not OK
 */
export const useSetAlertTags = (): {
  setAlertTags: (params: {
    tags: AlertTags;
    query: object;
  }) => Promise<estypes.UpdateByQueryResponse>;
} => {
  const { http } = useKibana<CoreStart>().services;
  return {
    setAlertTags: async ({ tags, query }) => {
      return http.fetch<estypes.UpdateByQueryResponse>(DETECTION_ENGINE_ALERT_TAGS_URL, {
        method: 'POST',
        body: JSON.stringify({ tags, query }),
      });
    },
  };
};
