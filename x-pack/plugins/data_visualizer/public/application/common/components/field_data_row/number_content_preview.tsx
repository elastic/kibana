/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import type { FileBasedFieldVisConfig } from '../stats_table/types/field_vis_config';

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
          <b>
            <FormattedMessage id="xpack.dataVisualizer.fieldStats.minTitle" defaultMessage="min" />
          </b>
        </EuiFlexItem>
        <EuiFlexItem>
          <b>
            <FormattedMessage
              id="xpack.dataVisualizer.fieldStats.medianTitle"
              defaultMessage="median"
            />
          </b>
        </EuiFlexItem>
        <EuiFlexItem>
          <b>
            <FormattedMessage id="xpack.dataVisualizer.fieldStats.maxTitle" defaultMessage="max" />
          </b>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup gutterSize="xs">
        <EuiFlexItem>{stats.min}</EuiFlexItem>
        <EuiFlexItem>{stats.median}</EuiFlexItem>
        <EuiFlexItem>{stats.max}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
