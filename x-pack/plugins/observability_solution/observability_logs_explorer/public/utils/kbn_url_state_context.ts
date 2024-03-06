/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import createContainer from 'constate';
import { useState } from 'react';
import { useKibanaContextForPlugin } from './use_kibana';

const useKbnUrlStateStorageFromRouter = () => {
  const {
    services: {
      appParams: { history },
      notifications: { toasts },
      uiSettings,
    },
  } = useKibanaContextForPlugin();

  const [urlStateStorage] = useState(() =>
    createKbnUrlStateStorage({
      history,
      useHash: uiSettings.get('state:storeInSessionStorage'),
      useHashQuery: false,
      ...withNotifyOnErrors(toasts),
    })
  );

  return urlStateStorage;
};

export const [KbnUrlStateStorageFromRouterProvider, useKbnUrlStateStorageFromRouterContext] =
  createContainer(useKbnUrlStateStorageFromRouter);
