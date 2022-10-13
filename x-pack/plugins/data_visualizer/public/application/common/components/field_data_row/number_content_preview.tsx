/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FileBasedFieldVisConfig } from '../stats_table/types';

export const FileBasedNumberContentPreview = ({ config }: { config: FileBasedFieldVisConfig }) => {
  const stats = config.stats;
  if (
    stats === undefined ||
    stats.min === undefined ||
    stats.median === undefined ||
    stats.max === undefined
  )
    return null;
  return (
    <EuiFlexGroup direction={'column'} gutterSize={'xs'}>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem>
          <EuiText size={'xs'}>
            <FormattedMessage id="xpack.dataVisualizer.fieldStats.minTitle" defaultMessage="min" />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size={'xs'}>
            <FormattedMessage
              id="xpack.dataVisualizer.fieldStats.medianTitle"
              defaultMessage="median"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size={'xs'}>
            <FormattedMessage id="xpack.dataVisualizer.fieldStats.maxTitle" defaultMessage="max" />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem>
          <EuiText size={'xs'}>{stats.min}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size={'xs'}>{stats.median}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size={'xs'}>{stats.max}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
