/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import { useExecutionContext } from '@kbn/kibana-react-plugin/public';
import { useMlKibana } from '../contexts/kibana';

export const MlPageWrapper: FC<{ path: string }> = ({ path, children }) => {
  const {
    services: { executionContext },
  } = useMlKibana();

  useExecutionContext(executionContext, {
    name: 'Machine Learning',
    type: 'application',
    page: path,
  });

  return <TrackApplicationView viewId={path}>{children}</TrackApplicationView>;
};
