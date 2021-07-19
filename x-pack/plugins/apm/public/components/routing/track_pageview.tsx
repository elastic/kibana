/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useRoutePath } from '@kbn/typed-react-router-config';
import { useTrackPageview } from '../../../../observability/public';

export function TrackPageview({ children }: { children: React.ReactElement }) {
  const routePath = useRoutePath();

  useTrackPageview({ app: 'apm', path: routePath });
  useTrackPageview({ app: 'apm', path: routePath, delay: 15000 });

  return children;
}
