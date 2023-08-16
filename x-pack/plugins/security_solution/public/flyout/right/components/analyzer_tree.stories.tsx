/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { ExpandableFlyoutContext } from '@kbn/expandable-flyout/src/context';
import { AnalyzerTree } from './analyzer_tree';
import * as mock from '../mocks/mock_analyzer_data';
import { RightPanelContext } from '../context';

export default {
  component: AnalyzerTree,
  title: 'Flyout/AnalyzerTree',
};

const defaultProps = {
  loading: false,
  error: false,
};

const flyoutContextValue = {
  openLeftPanel: () => {},
} as unknown as ExpandableFlyoutContext;

const contextValue = {
  eventId: 'eventId',
  indexName: 'indexName',
  scopeId: 'alerts-page',
} as unknown as RightPanelContext;

const wrapper = (children: React.ReactNode) => (
  <ExpandableFlyoutContext.Provider value={flyoutContextValue}>
    <RightPanelContext.Provider value={contextValue}>{children}</RightPanelContext.Provider>
  </ExpandableFlyoutContext.Provider>
);

export const Default: Story<void> = () => {
  return wrapper(<AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodes} />);
};

export const SingleNode: Story<void> = () => {
  return wrapper(<AnalyzerTree {...defaultProps} statsNodes={[mock.mockStatsNode]} />);
};

export const ShowParent: Story<void> = () => {
  return wrapper(<AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesHasParent} />);
};

export const ShowGrandparent: Story<void> = () => {
  return wrapper(
    <AnalyzerTree
      {...defaultProps}
      statsNodes={mock.mockStatsNodesHasGrandparent}
      ancestorLevel={2}
    />
  );
};

export const HideGrandparent: Story<void> = () => {
  return wrapper(
    <AnalyzerTree
      {...defaultProps}
      statsNodes={mock.mockStatsNodesHasGrandparent}
      ancestorLevel={1}
    />
  );
};

export const ShowChildren: Story<void> = () => {
  return wrapper(<AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesHasChildren} />);
};

export const ShowOnlyOneChild: Story<void> = () => {
  return wrapper(
    <AnalyzerTree
      {...defaultProps}
      statsNodes={mock.mockStatsNodesHasChildren}
      childCountLimit={1}
    />
  );
};

export const ShowGrandchildren: Story<void> = () => {
  return wrapper(<AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesHasChildren} />);
};

export const HideGrandchildren: Story<void> = () => {
  return wrapper(
    <AnalyzerTree
      {...defaultProps}
      statsNodes={mock.mockStatsNodesHasChildren}
      descendantLevel={1}
    />
  );
};

export const Loading: Story<void> = () => {
  return wrapper(<AnalyzerTree loading={true} error={false} descendantLevel={3} />);
};

export const Error: Story<void> = () => {
  return wrapper(<AnalyzerTree loading={false} error={true} descendantLevel={3} />);
};

export const Empty: Story<void> = () => {
  return wrapper(<AnalyzerTree {...defaultProps} />);
};
