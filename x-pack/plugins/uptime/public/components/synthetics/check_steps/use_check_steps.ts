/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';
import { FETCH_STATUS, useFetcher } from '../../../../../observability/public';
import { fetchJourneySteps } from '../../../state/api/journey';

export const useCheckSteps = () => {
  const { checkGroupId } = useParams<{ checkGroupId: string; stepIndex: string }>();

  const { data, status } = useFetcher(() => {
    return fetchJourneySteps({
      checkGroup: checkGroupId,
    });
  }, [checkGroupId]);

  return {
    steps: data?.steps ?? [],
    ping: data?.details.journey,
    timestamp: data?.details.timestamp,
    loading: status == FETCH_STATUS.LOADING || status === FETCH_STATUS.PENDING,
  };
};
