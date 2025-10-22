/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryFn } from '@storybook/react';
import React from 'react';
import { FocusedTraceWaterfall } from '.';
import { MockApmPluginStorybook } from '../../../context/apm_plugin/mock_apm_plugin_storybook';
import { getTraceParentChildrenMap } from '../../../../common/waterfall/parent_children_map';
import {
  getFocusedTraceItems,
  reparentDocumentToRoot,
} from '../../../../common/waterfall/build_focused_trace_items';

const stories: Meta<any> = {
  title: 'FocusedTraceWaterfall',
  component: FocusedTraceWaterfall,
  decorators: [
    (StoryComponent) => (
      <MockApmPluginStorybook>
        <StoryComponent />
      </MockApmPluginStorybook>
    ),
  ],
};
export default stories;

export const FocusedIdIsRoot: StoryFn<any> = () => {
  const focusedTraceItems = {
    rootDoc: {
      id: 'foo',
      timestampUs: new Date('2025-05-21T18:35:26.179Z').getTime() * 1000,
      name: 'root',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 50000,
      errors: [],
      serviceName: 'recommendation',
    },

    focusedTraceDoc: {
      id: 'foo',
      timestampUs: new Date('2025-05-21T18:35:26.179Z').getTime() * 1000,
      name: 'root',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 5000,
      errors: [],
      serviceName: 'recommendation',
    },
    focusedTraceTree: [
      {
        traceDoc: {
          id: '41b4177551ba7b6d',
          timestampUs: new Date('2025-05-21T18:35:26.190Z').getTime() * 1000,
          name: 'child',
          traceId: '01d9ebaca760279d6d68d29ea5283c58',
          duration: 5000,
          errors: [],
          parentId: 'foo',
          serviceName: 'flagd',
        },
        children: [],
      },
    ],
  };

  const reparentedItems = focusedTraceItems && reparentDocumentToRoot(focusedTraceItems);
  const traceItems = reparentedItems ? getFocusedTraceItems(reparentedItems) : [];

  return (
    <FocusedTraceWaterfall
      items={{
        traceItems,
        traceParentChildrenMap: getTraceParentChildrenMap(traceItems, false),
        summary: { services: 2, traceEvents: 2, errors: 0 },
      }}
    />
  );
};

export const ParentIdIsRoot: StoryFn<any> = () => {
  const focusedTraceItems = {
    rootDoc: {
      id: 'foo',
      timestampUs: new Date('2025-05-21T18:35:26.179Z').getTime() * 1000,
      name: 'root',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 50000,
      errors: [],
      serviceName: 'recommendation',
    },
    parentDoc: {
      id: 'foo',
      timestampUs: new Date('2025-05-21T18:35:26.179Z').getTime() * 1000,
      name: 'root',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 50000,
      errors: [],
      serviceName: 'recommendation',
    },
    focusedTraceDoc: {
      id: 'bar',
      timestampUs: new Date('2025-05-21T18:35:26.200Z').getTime() * 1000,
      name: 'focused',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 4000,
      parentId: 'foo',
      errors: [],
      serviceName: 'recommendation',
    },
    focusedTraceTree: [
      {
        traceDoc: {
          id: '41b4177551ba7b6d',
          timestampUs: new Date('2025-05-21T18:35:26.202Z').getTime() * 1000,
          name: 'child',
          traceId: '01d9ebaca760279d6d68d29ea5283c58',
          duration: 1000,
          errors: [],
          parentId: 'bar',
          serviceName: 'flagd',
        },
        children: [],
      },
    ],
  };

  const reparentedItems = focusedTraceItems && reparentDocumentToRoot(focusedTraceItems);
  const traceItems = reparentedItems ? getFocusedTraceItems(reparentedItems) : [];

  return (
    <FocusedTraceWaterfall
      items={{
        traceItems,
        traceParentChildrenMap: getTraceParentChildrenMap(traceItems, false),
        summary: { services: 2, traceEvents: 2, errors: 0 },
      }}
    />
  );
};

export const FocusedWithParent: StoryFn<any> = () => {
  const focusedTraceItems = {
    rootDoc: {
      id: 'foo',
      timestampUs: new Date('2025-05-21T18:35:26.179Z').getTime() * 1000,
      name: 'root',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 50000,
      errors: [],
      serviceName: 'recommendation',
    },
    parentDoc: {
      id: 'parent',
      timestampUs: new Date('2025-05-21T18:35:26.190Z').getTime() * 1000,
      name: 'Parent',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 30000,
      errors: [],
      serviceName: 'recommendation',
    },
    focusedTraceDoc: {
      id: 'bar',
      timestampUs: new Date('2025-05-21T18:35:26.195Z').getTime() * 1000,
      name: 'focused',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 25000,
      parentId: 'foo',
      errors: [],
      serviceName: 'recommendation',
    },
    focusedTraceTree: [
      {
        traceDoc: {
          id: '41b4177551ba7b6d',
          timestampUs: new Date('2025-05-21T18:35:26.200Z').getTime() * 1000,
          name: 'child',
          traceId: '01d9ebaca760279d6d68d29ea5283c58',
          duration: 10000,
          errors: [],
          parentId: 'bar',
          serviceName: 'flagd',
        },
        children: [],
      },
    ],
  };

  const reparentedItems = focusedTraceItems && reparentDocumentToRoot(focusedTraceItems);
  const traceItems = reparentedItems ? getFocusedTraceItems(reparentedItems) : [];

  return (
    <FocusedTraceWaterfall
      items={{
        traceItems,
        traceParentChildrenMap: getTraceParentChildrenMap(traceItems, false),
        summary: { services: 2, traceEvents: 2, errors: 0 },
      }}
    />
  );
};

export const FocusedWithMultipleChildren: StoryFn<any> = () => {
  const focusedTraceItems = {
    rootDoc: {
      id: 'foo',
      timestampUs: new Date('2025-05-21T18:35:26.179Z').getTime() * 1000,
      name: 'root',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 50000,
      errors: [],
      serviceName: 'recommendation',
    },
    parentDoc: {
      id: 'parent',
      timestampUs: new Date('2025-05-21T18:35:26.185Z').getTime() * 1000,
      name: 'Parent',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 40000,
      errors: [],
      serviceName: 'recommendation',
    },
    focusedTraceDoc: {
      id: 'bar',
      timestampUs: new Date('2025-05-21T18:35:26.185Z').getTime() * 1000,
      name: 'focused',
      traceId: '01d9ebaca760279d6d68d29ea5283c58',
      duration: 30000,
      parentId: 'foo',
      errors: [],
      serviceName: 'recommendation',
    },
    focusedTraceTree: [
      {
        traceDoc: {
          id: 'child1',
          timestampUs: new Date('2025-05-21T18:35:26.190Z').getTime() * 1000,
          name: 'child',
          traceId: '01d9ebaca760279d6d68d29ea5283c58',
          duration: 10000,
          errors: [],
          parentId: 'bar',
          serviceName: 'flagd',
        },
        children: [
          {
            traceDoc: {
              id: 'child2',
              timestampUs: new Date('2025-05-21T18:35:26.195Z').getTime() * 1000,
              name: 'child_2',
              traceId: '01d9ebaca760279d6d68d29ea5283c58',
              duration: 2000,
              errors: [],
              parentId: 'child1',
              serviceName: 'flagd',
            },
          },
        ],
      },
    ],
  };

  const reparentedItems = focusedTraceItems && reparentDocumentToRoot(focusedTraceItems);
  const traceItems = reparentedItems ? getFocusedTraceItems(reparentedItems) : [];

  return (
    <FocusedTraceWaterfall
      items={{
        traceItems,
        traceParentChildrenMap: getTraceParentChildrenMap(traceItems, false),
        summary: { services: 2, traceEvents: 2, errors: 0 },
      }}
    />
  );
};
