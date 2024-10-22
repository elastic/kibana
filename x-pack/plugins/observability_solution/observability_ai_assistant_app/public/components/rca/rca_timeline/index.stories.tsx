/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import type { SignificantEventsTimeline } from '@kbn/observability-utils-server/llm/service_rca/generate_timeline';
import { RootCauseAnalysisTimeline } from '.';

const stories: Meta<{}> = {
  title: 'RCA/Timeline',
  component: RootCauseAnalysisTimeline,
};

const mockTimeline: SignificantEventsTimeline = {
  events: [],
};

export default stories;

const start = new Date(`2024-10-21T12:15:00.000Z`).getTime();
const end = new Date(`2024-10-21T11:15:00.000Z`).getTime();

export const EmptyTimeline: Story<{}> = () => {
  return (
    <RootCauseAnalysisTimeline timeline={mockTimeline} loading={false} start={start} end={end} />
  );
};
