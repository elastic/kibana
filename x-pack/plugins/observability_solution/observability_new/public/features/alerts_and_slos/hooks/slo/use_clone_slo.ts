/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { useCallback } from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useObservabilityRouter } from '../../../../hooks/use_router';

export function useCloneSlo() {
  const { push } = useObservabilityRouter();

  return useCallback(
    (slo: SLOWithSummaryResponse) => {
      push('/slos/create', {
        path: '',
        query: {
          _a: `${encode({ ...slo, name: `[Copy] ${slo.name}`, id: undefined })}`,
        },
      });
    },
    [push]
  );
}
