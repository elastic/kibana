/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useKibana } from '../../../../common/lib/kibana';

interface FixedWidthLastUpdatedContainerProps {
  updatedAt: number;
}

export const FixedWidthLastUpdatedContainer = React.memo<FixedWidthLastUpdatedContainerProps>(
  ({ updatedAt }) => {
    const { timelines } = useKibana().services;
    return updatedAt > 0 ? <span>{timelines.getLastUpdated({ updatedAt })}</span> : null;
  }
);

FixedWidthLastUpdatedContainer.displayName = 'FixedWidthLastUpdatedContainer';
