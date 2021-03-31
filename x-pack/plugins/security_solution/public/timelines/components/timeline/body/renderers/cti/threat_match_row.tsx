/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Ecs } from '../../../../../../../common/ecs';
import { BrowserFields } from '../../../../../../common/containers/source';
import { RowRendererContainer } from '../row_renderer';

export const ThreatMatchRow = ({
  browserFields,
  data,
  timelineId,
}: {
  browserFields: BrowserFields;
  data: Ecs;
  timelineId: string;
}) => (
  <RowRendererContainer data-test-subj="threat-match-row-renderer">
    <span />
  </RowRendererContainer>
);
