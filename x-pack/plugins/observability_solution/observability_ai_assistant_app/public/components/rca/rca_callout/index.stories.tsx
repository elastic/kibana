/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';
import { RootCauseAnalysisCallout } from '.';

const stories: Meta<{}> = {
  title: 'RCA/Callout',
  component: RootCauseAnalysisCallout,
};

export default stories;

export const Default: Story<{}> = () => {
  return (
    <RootCauseAnalysisCallout
      onClick={() => {}}
      onCompleteInBackgroundClick={() => {}}
      completeInBackground
    />
  );
};

export const CompleteInBackgroundDisabled: Story<{}> = () => {
  return (
    <RootCauseAnalysisCallout
      onClick={() => {}}
      onCompleteInBackgroundClick={() => {}}
      completeInBackground={false}
    />
  );
};
