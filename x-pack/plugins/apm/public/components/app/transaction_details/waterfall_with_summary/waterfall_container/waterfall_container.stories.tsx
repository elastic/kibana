/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { noop } from 'lodash';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { WaterfallContainer } from '.';
import {
  inferredSpans,
  manyChildrenWithSameLength,
  simpleTrace,
  traceChildStartBeforeParent,
  traceWithErrors,
} from './waterfall_container.stories.data';
import { getWaterfall } from '../../../../../../common/waterfall_helper';
import { MockApmPluginStorybook } from '../../../../../context/apm_plugin/mock_apm_plugin_storybook';

type Args = ComponentProps<typeof WaterfallContainer>;

const stories: Meta<Args> = {
  title: 'app/TransactionDetails/waterfall',
  component: WaterfallContainer,
  decorators: [
    (StoryComponent) => (
      <MockApmPluginStorybook routePath="/services/{serviceName}/transactions/view?rangeFrom=now-15m&rangeTo=now&transactionName=testTransactionName">
        <StoryComponent />
      </MockApmPluginStorybook>
    ),
  ],
};
export default stories;

export const Example: Story<Args> = ({
  serviceName,
  waterfallItemId,
  waterfall,
}) => {
  return (
    <WaterfallContainer
      serviceName={serviceName}
      waterfallItemId={waterfallItemId}
      waterfall={waterfall}
      showCriticalPath={false}
      onShowCriticalPathChange={noop}
    />
  );
};
Example.args = {
  waterfall: getWaterfall(simpleTrace, '975c8d5bfd1dd20b'),
};

export const WithErrors: Story<Args> = ({
  serviceName,
  waterfallItemId,
  waterfall,
}) => {
  return (
    <WaterfallContainer
      serviceName={serviceName}
      waterfallItemId={waterfallItemId}
      waterfall={waterfall}
      showCriticalPath={false}
      onShowCriticalPathChange={noop}
    />
  );
};
WithErrors.args = {
  waterfall: getWaterfall(traceWithErrors, '975c8d5bfd1dd20b'),
};

export const ChildStartsBeforeParent: Story<Args> = ({
  serviceName,
  waterfallItemId,
  waterfall,
}) => {
  return (
    <WaterfallContainer
      serviceName={serviceName}
      waterfallItemId={waterfallItemId}
      waterfall={waterfall}
      showCriticalPath={false}
      onShowCriticalPathChange={noop}
    />
  );
};
ChildStartsBeforeParent.args = {
  waterfall: getWaterfall(traceChildStartBeforeParent, '975c8d5bfd1dd20b'),
};

export const InferredSpans: Story<Args> = ({
  serviceName,
  waterfallItemId,
  waterfall,
}) => {
  return (
    <WaterfallContainer
      serviceName={serviceName}
      waterfallItemId={waterfallItemId}
      waterfall={waterfall}
      showCriticalPath={false}
      onShowCriticalPathChange={noop}
    />
  );
};
InferredSpans.args = {
  waterfall: getWaterfall(inferredSpans, 'f2387d37260d00bd'),
};

export const ManyChildrenWithSameLength: Story<Args> = ({
  serviceName,
  waterfallItemId,
  waterfall,
}) => {
  return (
    <WaterfallContainer
      serviceName={serviceName}
      waterfallItemId={waterfallItemId}
      waterfall={waterfall}
      showCriticalPath={false}
      onShowCriticalPathChange={noop}
    />
  );
};
ManyChildrenWithSameLength.args = {
  waterfall: getWaterfall(manyChildrenWithSameLength, '9a7f717439921d39'),
};
