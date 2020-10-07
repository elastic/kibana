/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import { IStorageWrapper } from '../../../../../../src/plugins/kibana_utils/public';

export function useWelcomeMessage(storage: IStorageWrapper): [boolean, () => void] {
  const key = `drilldowns:hidWelcomeMessage`;
  const [hideWelcomeMessage, setHideWelcomeMessage] = useState<boolean>(storage.get(key) ?? false);

  return [
    !hideWelcomeMessage,
    () => {
      if (hideWelcomeMessage) return;
      setHideWelcomeMessage(true);
      storage.set(key, true);
    },
  ];
}
