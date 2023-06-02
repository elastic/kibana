/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { AnalyzerTree } from './analyzer_tree';
import * as mock from '../mocks/mock_analyzer_data';

export default {
  component: AnalyzerTree,
  title: 'Flyout/AnalyzerTree',
};

const defaultProps = {
  loading: false,
  error: false,
};

export const Default: Story<void> = () => {
  return <AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodes} />;
};

export const HasGrandparent: Story<void> = () => {
  return <AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesHasGrandparent} />;
};

export const HasParent: Story<void> = () => {
  return <AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesHasParent} />;
};

export const HasChildren: Story<void> = () => {
  return <AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesHasChildren} />;
};

export const HasMoreThanThreeChildren: Story<void> = () => {
  return <AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesMoreThanThreeChildren} />;
};

export const HasGrandChildren: Story<void> = () => {
  return <AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesHasGrandchildren} />;
};

export const SingleNode: Story<void> = () => {
  return <AnalyzerTree {...defaultProps} statsNodes={mock.mockStatsNodesSingleNode} />;
};

export const Loading: Story<void> = () => {
  return <AnalyzerTree loading={true} error={false} />;
};

export const Error: Story<void> = () => {
  return <AnalyzerTree loading={false} error={true} />;
};

export const Empty: Story<void> = () => {
  return <AnalyzerTree {...defaultProps} />;
};
