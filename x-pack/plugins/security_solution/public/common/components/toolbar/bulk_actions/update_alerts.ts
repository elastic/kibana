/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateByQueryResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Status } from '../../../../../common/api/detection_engine';
import {
  updateAlertStatusByIds,
  updateAlertStatusByQuery,
} from '../../../../detections/containers/detection_engine/alerts/api';

interface UpdatedAlertsResponse {
  updated: number;
  version_conflicts: UpdateByQueryResponse['version_conflicts'];
}

interface UpdatedAlertsProps {
  status: Status;
  query?: object;
  signalIds?: string[];
  signal?: AbortSignal;
}

/**
 * Update alert status by query or signalIds.
 *  Either query or signalIds must be provided
 * `signalIds` is the preferred way to update alerts because it is more cost effective on Serverless.
 *
 * @param status to update to('open' / 'closed' / 'acknowledged')
 * @param index index to be updated
 * @param query optional query object to update alerts by query.
 * @param signalIds optional signalIds to update alerts by signalIds.
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const updateAlertStatus = ({
  status,
  query,
  signalIds,
  signal,
}: UpdatedAlertsProps): Promise<UpdatedAlertsResponse> => {
  if (signalIds && signalIds.length > 0) {
    return updateAlertStatusByIds({ status, signalIds, signal }).then(({ updated }) => ({
      updated: updated ?? 0,
      version_conflicts: 0,
    }));
  } else if (query) {
    return updateAlertStatusByQuery({ status, query, signal }).then(
      ({ updated, version_conflicts: conflicts }) => ({
        updated: updated ?? 0,
        version_conflicts: conflicts,
      })
    );
  }
  throw new Error('Either query or signalIds must be provided');
};
