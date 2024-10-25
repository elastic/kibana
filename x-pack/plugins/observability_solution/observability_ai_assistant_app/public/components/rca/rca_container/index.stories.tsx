/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import { RootCauseAnalysisContainer } from '.';
// @ts-ignore
import fullAnalysis from '../mock/complete_root_cause_analysis.json';

const stories: Meta<{}> = {
  title: 'RCA/Container',
  component: RootCauseAnalysisContainer,
};

export default stories;

export const Empty: Story<{}> = () => {
  return <RootCauseAnalysisContainer loading={false} onStartAnalysisClick={() => {}} />;
};

export const Loading: Story<{}> = () => {
  return <RootCauseAnalysisContainer loading onStartAnalysisClick={() => {}} />;
};

export const Completed: Story<{}> = () => {
  return (
    <RootCauseAnalysisContainer
      loading={false}
      events={fullAnalysis as any[]}
      onStartAnalysisClick={() => {}}
    />
  );
};
