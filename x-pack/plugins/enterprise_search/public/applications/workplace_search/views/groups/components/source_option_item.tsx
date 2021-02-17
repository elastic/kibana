/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { TruncatedContent } from '../../../../shared/truncate';
import { SourceIcon } from '../../../components/shared/source_icon';
import { ContentSource } from '../../../types';

const MAX_LENGTH = 28;

interface SourceOptionItemProps {
  source: ContentSource;
}

export const SourceOptionItem: React.FC<SourceOptionItemProps> = ({ source }) => (
  <EuiFlexGroup gutterSize="xs" justifyContent="flexStart" alignItems="center">
    <EuiFlexItem grow={false}>
      <SourceIcon wrapped {...source} />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <TruncatedContent tooltipType="title" content={source.name} length={MAX_LENGTH} />
    </EuiFlexItem>
  </EuiFlexGroup>
);
