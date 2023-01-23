/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { EmbeddedMap } from './embedded_map';

export function LatencyMap({
  start,
  end,
  kuery,
  filters,
}: {
  start: string;
  end: string;
  kuery?: string;
  filters: Filter[];
}) {
  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.apm.serviceOverview.embeddedMap.title', {
            defaultMessage: 'Average latency per country',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EmbeddedMap start={start} end={end} kuery={kuery} filters={filters} />
    </>
  );
}
