/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Story } from '@storybook/react';
import { EuiSpacer } from '@elastic/eui';
import { EntityPanel } from './entity_panel';
import type { EntityType } from '../types';

export default {
  component: EntityPanel,
  title: 'Flyout/EntityPanel',
};

const HOST = 'host';
const USER = 'user';

const defaultProps = {
  title: 'title',
  type: HOST as EntityType,
  content: 'test content',
};

export const Default: Story<void> = () => {
  return (
    <>
      <EntityPanel {...defaultProps} />
      <EuiSpacer size="m" />
      <EntityPanel {...defaultProps} type={USER as EntityType} />
    </>
  );
};

export const Expandable: Story<void> = () => {
  return (
    <>
      <EntityPanel {...defaultProps} expandable={true} />
      <EuiSpacer size="m" />
      <EntityPanel {...defaultProps} expandable={true} type={USER as EntityType} />
    </>
  );
};

export const ExpandableDefaultOpen: Story<void> = () => {
  return (
    <>
      <EntityPanel {...defaultProps} expandable={true} expanded={true} />
      <EuiSpacer size="m" />
      <EntityPanel {...defaultProps} expandable={true} expanded={true} type={USER as EntityType} />
    </>
  );
};

export const Empty: Story<void> = () => {
  return (
    <>
      <EntityPanel {...defaultProps} content={null} />
      <EuiSpacer size="m" />
      <EntityPanel {...defaultProps} content={null} type={USER as EntityType} />
      <EuiSpacer size="m" />
      <EntityPanel {...defaultProps} expandable={true} content={null} />
      <EuiSpacer size="m" />
      <EntityPanel {...defaultProps} expandable={true} content={null} type={USER as EntityType} />
    </>
  );
};
