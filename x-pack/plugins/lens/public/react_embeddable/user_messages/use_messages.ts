/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { useMemo } from 'react';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { LensInternalApi } from '../types';

export function useMessages({ messages$, blockingMessages$ }: LensInternalApi) {
  const latestMessages = useStateFromPublishingSubject(messages$);
  const latestBlockingMessages = useStateFromPublishingSubject(blockingMessages$);
  const [warningOrErrorMessages, infoMessages] = useMemo(
    () => partition(latestMessages, ({ severity }) => severity !== 'info'),
    [latestMessages]
  );

  return [latestBlockingMessages, warningOrErrorMessages, infoMessages];
}
