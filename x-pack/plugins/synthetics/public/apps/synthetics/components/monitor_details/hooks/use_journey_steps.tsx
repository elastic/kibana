/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetcher } from '@kbn/observability-plugin/public';
import { SyntheticsJourneyApiResponse } from '../../../../../../common/runtime_types';
import { fetchJourneySteps } from '../../../state';

export const useJourneySteps = (checkGroup: string | undefined) => {
  const { data, loading } = useFetcher(() => {
    if (!checkGroup) {
      return Promise.resolve(null);
    }

    return fetchJourneySteps({ checkGroup });
  }, [checkGroup]);

  return { data: data as SyntheticsJourneyApiResponse, loading: loading ?? false };
};
