/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { EntityPanel } from './entity_panel';

export default {
  component: EntityPanel,
  title: 'Flyout/EntityPanel',
};

const defaultProps = {
  title: 'title',
  iconType: 'storage',
  content: 'test content',
};

export const Default: Story<void> = () => {
  return <EntityPanel {...defaultProps} />;
};

export const Expandable: Story<void> = () => {
  return <EntityPanel {...defaultProps} expandable={true} />;
};

export const ExpandableDefaultOpen: Story<void> = () => {
  return <EntityPanel {...defaultProps} expandable={true} expanded={true} />;
};

export const EmptyDefault: Story<void> = () => {
  return <EntityPanel {...defaultProps} content={null} />;
};

export const EmptyDefaultExpanded: Story<void> = () => {
  return <EntityPanel {...defaultProps} expandable={true} content={null} />;
};
