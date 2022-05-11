/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { Ecs } from '../../../../../../../common/ecs';

import { NetflowRenderer } from '../netflow';
import { ZeekSignature } from './zeek_signature';

const Details = styled.div`
  margin: 5px 0;
`;

Details.displayName = 'Details';

interface ZeekDetailsProps {
  data: Ecs;
  isDraggable?: boolean;
  timelineId: string;
}

export const ZeekDetails = React.memo<ZeekDetailsProps>(({ data, isDraggable, timelineId }) =>
  data.zeek != null ? (
    <Details>
      <ZeekSignature data={data} isDraggable={isDraggable} timelineId={timelineId} />
      <EuiSpacer size="s" />
      <NetflowRenderer data={data} isDraggable={isDraggable} timelineId={timelineId} />
    </Details>
  ) : null
);

ZeekDetails.displayName = 'ZeekDetails';
