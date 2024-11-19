/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Meta } from '@storybook/react';
import React from 'react';
import { FrameType } from '@kbn/profiling-utils';
import { MockProfilingDependenciesStorybook } from '../contexts/profiling_dependencies/mock_profiling_dependencies_storybook';
import { MissingSymbolsCallout } from './missing_symbols_callout';

const stories: Meta<{}> = {
  title: 'shared/Frame information window/Missing symbols',
  component: MissingSymbolsCallout,
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
  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <MissingSymbolsCallout frameType={FrameType.Native} />
      </EuiFlexItem>
      <EuiFlexItem>
        <MissingSymbolsCallout frameType={FrameType.JVM} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
