/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ErrorDistribution } from '.';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';

type Args = ComponentProps<typeof ErrorDistribution>;

const stories: Meta<Args> = {
  title: 'app/ErrorGroupDetails/distribution',
  component: ErrorDistribution,
  tags: ['skip-test'],
  decorators: [
    (StoryComponent) => {
      return (
        <MockApmPluginStorybook routePath="/services/{serviceName}/errors/{groupId}?kuery=&rangeFrom=now-15m&rangeTo=now&environment=ENVIRONMENT_ALL&serviceGroup=&comparisonEnabled=true&transactionType=request&offset=1d">
          <StoryComponent />
        </MockApmPluginStorybook>
      );
    },
  ],
};

export default stories;

export const Example: StoryObj<Args> = {
  render: (args) => {
    return <ErrorDistribution {...args} />;
  },
  args: {
    distribution: {
      bucketSize: 62350,
      currentPeriod: [
        { x: 1624279912350, y: 6 },
        { x: 1624279974700, y: 1 },
        { x: 1624280037050, y: 2 },
        { x: 1624280099400, y: 3 },
        { x: 1624280161750, y: 13 },
        { x: 1624280224100, y: 1 },
        { x: 1624280286450, y: 2 },
        { x: 1624280348800, y: 0 },
        { x: 1624280411150, y: 4 },
        { x: 1624280473500, y: 4 },
        { x: 1624280535850, y: 1 },
        { x: 1624280598200, y: 4 },
        { x: 1624280660550, y: 0 },
        { x: 1624280722900, y: 2 },
        { x: 1624280785250, y: 3 },
        { x: 1624280847600, y: 0 },
      ],
      previousPeriod: [
        { x: 1624279912350, y: 6 },
        { x: 1624279974700, y: 1 },
        { x: 1624280037050, y: 2 },
        { x: 1624280099400, y: 3 },
        { x: 1624280161750, y: 13 },
        { x: 1624280224100, y: 1 },
        { x: 1624280286450, y: 2 },
        { x: 1624280348800, y: 0 },
        { x: 1624280411150, y: 4 },
        { x: 1624280473500, y: 4 },
        { x: 1624280535850, y: 1 },
        { x: 1624280598200, y: 4 },
        { x: 1624280660550, y: 0 },
        { x: 1624280722900, y: 2 },
        { x: 1624280785250, y: 3 },
        { x: 1624280847600, y: 0 },
      ],
    },
    fetchStatus: FETCH_STATUS.SUCCESS,
    title: 'Foo title',
  },
  tags: ['skip-test'],
};

export const EmptyState: StoryObj<Args> = {
  render: (args) => {
    return <ErrorDistribution {...args} />;
  },
  args: {
    fetchStatus: FETCH_STATUS.SUCCESS,
    distribution: {
      bucketSize: 10,
      currentPeriod: [],
      previousPeriod: [],
    },
    title: 'Foo title',
  },
  tags: ['skip-test'],
};
