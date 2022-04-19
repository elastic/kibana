/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

export const MlPageWrapper: FC<{ path: string }> = ({ path, children }) => {
  return <TrackApplicationView viewId={path}>{children}</TrackApplicationView>;
};
