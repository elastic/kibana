/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import { TrackApplicationView } from '../../../../../../src/plugins/usage_collection/public/components/track_application_view/track_application_view';

export const MlPageWrapper: FC<{ path: string }> = ({ path, children }) => {
  return <TrackApplicationView viewId={path}>{children}</TrackApplicationView>;
};
