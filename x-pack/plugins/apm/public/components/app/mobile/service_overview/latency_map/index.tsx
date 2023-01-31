/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { EmbeddedMap } from './embedded_map';

export function LatencyMap({
  start,
  end,
  kuery,
  filters,
  comparisonEnabled,
}: {
  start: string;
  end: string;
  kuery?: string;
  filters: Filter[];
  comparisonEnabled: boolean;
}) {
  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.apm.serviceOverview.embeddedMap.title', {
                defaultMessage: 'Average latency per country',
              })}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {comparisonEnabled && (
            <EuiIconTip
              content={i18n.translate('xpack.apm.comparison.not.support', {
                defaultMessage: 'Comparison is not supported',
              })}
              size="m"
              type="alert"
              color="warning"
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EmbeddedMap start={start} end={end} kuery={kuery} filters={filters} />
    </>
  );
}
