/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy } from 'lodash';
import { useMemo } from 'react';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { LensInternalApi } from '../types';

export function useMessages({ messages$ }: LensInternalApi) {
  const latestMessages = useStateFromPublishingSubject(messages$);
  return useMemo(() => groupBy(latestMessages, ({ severity }) => severity), [latestMessages]);
}
