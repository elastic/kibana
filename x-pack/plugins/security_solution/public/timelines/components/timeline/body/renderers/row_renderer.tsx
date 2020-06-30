/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { BrowserFields } from '../../../../../common/containers/source';
import { Ecs } from '../../../../../graphql/types';
import { EventsTrSupplement } from '../../styles';

interface RowRendererContainerProps {
  children: React.ReactNode;
}

export const RowRendererContainer = React.memo<RowRendererContainerProps>(({ children }) => (
  <EventsTrSupplement className="siemEventsTable__trSupplement--summary">
    {children}
  </EventsTrSupplement>
));
RowRendererContainer.displayName = 'RowRendererContainer';

export interface RowRenderer {
  isInstance: (data: Ecs) => boolean;
  renderRow: ({
    browserFields,
    data,
    timelineId,
  }: {
    browserFields: BrowserFields;
    data: Ecs;
    timelineId: string;
  }) => React.ReactNode;
}
