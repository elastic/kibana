/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect, useState } from 'react';
// @ts-ignore
import { __RouterContext, RouteComponentProps } from 'react-router';

export const useRouter = (): RouteComponentProps => {
  const forceUpdate = () => useState(null)[1];
  const context: RouteComponentProps = useContext(__RouterContext);
  if (!context) {
    throw new Error('useRouter only works inside a react-router context.');
  }
  useEffect(() => context.history.listen(forceUpdate), [context]);
  return context;
};
