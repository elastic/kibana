/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { EuiIcon } from '@elastic/eui';
import { EntityPanel } from './entity_panel';

export default {
  component: EntityPanel,
  title: 'Flyout/EntityPanel',
};

const defaultProps = {
  title: 'title',
  iconType: 'storage',
};
const headerContent = <EuiIcon type="expand" />;

const children = <p>{'test content'}</p>;

export const Default: Story<void> = () => {
  return <EntityPanel {...defaultProps}>{children}</EntityPanel>;
};

export const DefaultWithHeaderContent: Story<void> = () => {
  return (
    <EntityPanel {...defaultProps} headerContent={headerContent}>
      {children}
    </EntityPanel>
  );
};

export const Expandable: Story<void> = () => {
  return (
    <EntityPanel {...defaultProps} expandable={true}>
      {children}
    </EntityPanel>
  );
};

export const ExpandableDefaultOpen: Story<void> = () => {
  return (
    <EntityPanel {...defaultProps} expandable={true} expanded={true}>
      {children}
    </EntityPanel>
  );
};

export const EmptyDefault: Story<void> = () => {
  return <EntityPanel {...defaultProps} />;
};

export const EmptyDefaultExpanded: Story<void> = () => {
  return <EntityPanel {...defaultProps} expandable={true} />;
};
