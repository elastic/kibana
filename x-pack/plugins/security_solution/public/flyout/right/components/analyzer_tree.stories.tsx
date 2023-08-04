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

export const HasGrandparent: Story<void> = () => {
  return wrapper(<AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesHasGrandparent} />);
};

export const HasParent: Story<void> = () => {
  return wrapper(<AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesHasParent} />);
};

export const HasChildren: Story<void> = () => {
  return wrapper(<AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesHasChildren} />);
};

export const HasMoreThanThreeChildren: Story<void> = () => {
  return wrapper(
    <AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesMoreThanThreeChildren} />
  );
};

export const HasGrandChildren: Story<void> = () => {
  return wrapper(
    <AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesHasGrandchildren} />
  );
};

export const SingleNode: Story<void> = () => {
  return wrapper(<AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesSingleNode} />);
};

export const Loading: Story<void> = () => {
  return wrapper(<AnalyzerTree loading={true} error={false} />);
};

export const Error: Story<void> = () => {
  return wrapper(<AnalyzerTree loading={false} error={true} />);
};

export const Empty: Story<void> = () => {
  return wrapper(<AnalyzerTree {...defaultProps} />);
};
