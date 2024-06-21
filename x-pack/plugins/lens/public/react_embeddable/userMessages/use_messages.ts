/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import { useEffect, useState } from 'react';
import type { UserMessage, UserMessagesDisplayLocationId, UserMessagesGetter } from '../../types';

const blockingMessageDisplayLocations: UserMessagesDisplayLocationId[] = [
  'visualization',
  'visualizationOnEmbeddable',
];
export function useMessages(getUserMessages: UserMessagesGetter, hasRendered: boolean) {
  const [blockingErrors, setBlockingErrors] = useState<UserMessage[]>([]);
  const [embeddableMessages, setEmbeddableMessages] = useState<UserMessage[]>([]);

  useEffect(() => {
    setBlockingErrors(
      getUserMessages(blockingMessageDisplayLocations, {
        severity: 'error',
      })
    );
    if (hasRendered) {
      setEmbeddableMessages(getUserMessages('embeddableBadge'));
    }
  }, [getUserMessages, hasRendered]);

  const [warningOrErrorMessages, infoMessages] = partition(
    embeddableMessages,
    ({ severity }) => severity !== 'info'
  );

  return [blockingErrors, warningOrErrorMessages, infoMessages];
}
