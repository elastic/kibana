/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EmbeddedMap } from './embedded_map';

export function LatencyMap() {
  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.apm.serviceOverview.embeddedMap.title', {
            defaultMessage: 'Geographic regions',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">
        {i18n.translate('xpack.apm.serviceOverview.embeddedMap.description', {
          defaultMessage: 'Map showing the average latency based on country.',
        })}
      </EuiText>
      <EuiSpacer size="s" />
      <EmbeddedMap />
    </>
  );
}
