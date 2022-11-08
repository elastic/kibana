/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useParams } from 'react-router-dom';

export const useStepFilters = (prevCheckGroupId?: string) => {
  const { checkGroupId, stepIndex } = useParams<{ checkGroupId: string; stepIndex: string }>();
  return [
    {
      term: {
        'monitor.check_group': prevCheckGroupId ?? checkGroupId,
      },
    },
    {
      term: {
        'synthetics.step.index': Number(stepIndex),
      },
    },
  ];
};
