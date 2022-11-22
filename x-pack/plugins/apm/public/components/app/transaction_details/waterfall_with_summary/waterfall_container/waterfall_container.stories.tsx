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
import { getWaterfall } from './waterfall/waterfall_helpers/waterfall_helpers';
import {
  inferredSpans,
  manyChildrenWithSameLength,
  simpleTrace,
  traceChildStartBeforeParent,
  traceWithErrors,
} from './waterfall_container.stories.data';
import type { ApmPluginContextValue } from '../../../../../context/apm_plugin/apm_plugin_context';

type Args = ComponentProps<typeof WaterfallContainer>;

const apmPluginContextMock = {
  core: {
    http: {
      basePath: { prepend: () => {} },
    },
  },
} as unknown as ApmPluginContextValue;

const stories: Meta<Args> = {
  title: 'app/TransactionDetails/waterfall',
  component: WaterfallContainer,
  decorators: [
    (StoryComponent) => (
      <MemoryRouter
        initialEntries={[
          '/services/{serviceName}/transactions/view?rangeFrom=now-15m&rangeTo=now&transactionName=testTransactionName',
        ]}
      >
        <MockApmPluginContextWrapper value={apmPluginContextMock}>
          <StoryComponent />
        </MockApmPluginContextWrapper>
      </MemoryRouter>
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
