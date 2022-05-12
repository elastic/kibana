/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Meta, Story } from '@storybook/react';
import React, { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../../../context/apm_plugin/mock_apm_plugin_context';
import { WaterfallContainer } from '.';
import { getWaterfall } from './waterfall/waterfall_helpers/waterfall_helpers';
import {
  inferredSpans,
  manyChildrenWithSameLength,
  simpleTrace,
  traceChildStartBeforeParent,
  traceWithErrors,
  urlParams as testUrlParams,
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

export const Example: Story<Args> = ({ urlParams, waterfall }) => {
  return <WaterfallContainer urlParams={urlParams} waterfall={waterfall} />;
};
Example.args = {
  urlParams: testUrlParams,
  waterfall: getWaterfall(simpleTrace, '975c8d5bfd1dd20b'),
};

export const WithErrors: Story<Args> = ({ urlParams, waterfall }) => {
  return <WaterfallContainer urlParams={urlParams} waterfall={waterfall} />;
};
WithErrors.args = {
  urlParams: testUrlParams,
  waterfall: getWaterfall(traceWithErrors, '975c8d5bfd1dd20b'),
};

export const ChildStartsBeforeParent: Story<Args> = ({
  urlParams,
  waterfall,
}) => {
  return <WaterfallContainer urlParams={urlParams} waterfall={waterfall} />;
};
ChildStartsBeforeParent.args = {
  urlParams: testUrlParams,
  waterfall: getWaterfall(traceChildStartBeforeParent, '975c8d5bfd1dd20b'),
};

export const InferredSpans: Story<Args> = ({ urlParams, waterfall }) => {
  return <WaterfallContainer urlParams={urlParams} waterfall={waterfall} />;
};
InferredSpans.args = {
  urlParams: testUrlParams,
  waterfall: getWaterfall(inferredSpans, 'f2387d37260d00bd'),
};

export const ManyChildrenWithSameLength: Story<Args> = ({
  urlParams,
  waterfall,
}) => {
  return <WaterfallContainer urlParams={urlParams} waterfall={waterfall} />;
};
ManyChildrenWithSameLength.args = {
  urlParams: testUrlParams,
  waterfall: getWaterfall(manyChildrenWithSameLength, '9a7f717439921d39'),
};
