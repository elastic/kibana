/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ColorPalette } from './color_palette';
import { useObjectMetrics } from '../hooks/use_object_metrics';

export const ObjectCountList = () => {
  const objectMetrics = useObjectMetrics();

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h3>{OBJECT_COUNT_LABEL}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            {TOTAL_LABEL}: <span style={{ fontWeight: 'bold' }}> {objectMetrics.totalObjects}</span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div>
        {objectMetrics.items.map(({ label, mimeType, percent, count }) => (
          <Fragment key={mimeType}>
            <ColorPalette
              label={label}
              mimeType={mimeType}
              percent={percent}
              value={String(count)}
              valueWidth={30}
              loading={objectMetrics.loading}
            />
            <EuiSpacer size="m" />
          </Fragment>
        ))}
      </div>
    </>
  );
};

const OBJECT_COUNT_LABEL = i18n.translate('xpack.synthetics.stepDetails.objectCount', {
  defaultMessage: 'Object count',
});

const TOTAL_LABEL = i18n.translate('xpack.synthetics.stepDetails.total', {
  defaultMessage: 'Total',
});
