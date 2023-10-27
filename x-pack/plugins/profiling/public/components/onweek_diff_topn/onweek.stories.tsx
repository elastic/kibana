/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Meta } from '@storybook/react';
import React from 'react';
import { OnWeelkDiffTopN } from '.';
import { MockProfilingDependenciesStorybook } from '../contexts/profiling_dependencies/mock_profiling_dependencies_storybook';
import baseJSON from './__mock__/base.json';
import comparisonJSON from './__mock__/comparison.json';

const stories: Meta<{}> = {
  title: 'onWeek/Diff topN',
  component: OnWeelkDiffTopN,
  decorators: [
    (StoryComponent, { globals }) => {
      return (
        <MockProfilingDependenciesStorybook>
          <StoryComponent />
        </MockProfilingDependenciesStorybook>
      );
    },
  ],
};

export default stories;

export function Examples() {
  return <OnWeelkDiffTopN base={baseJSON} comparison={comparisonJSON} />;
}
