/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import { RootCauseAnalysisHypothesizeStepItem } from '.';

const stories: Meta<{}> = {
  title: 'RCA/HypothesizeStepItem',
  component: RootCauseAnalysisHypothesizeStepItem,
};

const content =
  'The high rate of HTTP 500 errors in the controller service for the /api/cart endpoint is likely due to issues with the upstream service default-my-otel-demo-frontendproxy-8080, as indicated by logs showing upstream prematurely closed connections. The next step is to investigate the health and performance of the upstream service default-my-otel-demo-frontendproxy-8080.';

export default stories;

export const Default: Story<{}> = () => {
  return <RootCauseAnalysisHypothesizeStepItem content={content} />;
};
