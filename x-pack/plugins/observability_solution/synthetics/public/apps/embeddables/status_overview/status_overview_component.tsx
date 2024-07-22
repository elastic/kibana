/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { OverviewStatus } from '../../synthetics/components/monitors_page/overview/overview/overview_status';
import { SyntheticsEmbeddableContext } from '../synthetics_embeddable_context';

export const StatusOverviewComponent = () => {
  return (
    <SyntheticsEmbeddableContext>
      <OverviewStatus />
    </SyntheticsEmbeddableContext>
  );
};
