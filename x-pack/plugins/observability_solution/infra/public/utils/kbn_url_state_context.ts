/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core-notifications-browser';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import createContainer from 'constate';
import { History } from 'history';
import { useState } from 'react';

const useKbnUrlStateStorageFromRouter = ({
  history,
  toastsService,
}: {
  history: History<unknown>;
  toastsService: IToasts;
}) => {
  const [urlStateStorage] = useState(() =>
    createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
      ...withNotifyOnErrors(toastsService),
    })
  );

  return urlStateStorage;
};

export const [KbnUrlStateStorageFromRouterProvider, useKbnUrlStateStorageFromRouterContext] =
  createContainer(useKbnUrlStateStorageFromRouter);
