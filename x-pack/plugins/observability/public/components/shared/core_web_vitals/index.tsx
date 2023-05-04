/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import {
  CLS_HELP_LABEL,
  CLS_LABEL,
  FID_HELP_LABEL,
  FID_LABEL,
  LCP_HELP_LABEL,
  LCP_LABEL,
} from './translations';
import { CoreVitalItem } from './core_vital_item';
import { WebCoreVitalsTitle } from './web_core_vitals_title';
import { ServiceName } from './service_name';
import { CoreVitalProps } from '../types';

export interface UXMetrics {
  cls: number | null;
  fid?: number | null;
  lcp?: number | null;
  tbt: number;
  fcp?: number | null;
  coreVitalPages: number;
  lcpRanks: number[];
  fidRanks: number[];
  clsRanks: number[];
}

function formatToSec(value?: number | string, fromUnit = 'MicroSec'): string {
  const valueInMs = Number(value ?? 0) / (fromUnit === 'MicroSec' ? 1000 : 1);

  if (valueInMs < 1000) {
    return valueInMs.toFixed(0) + ' ms';
  }
  return (valueInMs / 1000).toFixed(2) + ' s';
}

function formatToMilliseconds(value?: number | null) {
  if (typeof value === 'undefined' || value === null) {
    return null;
  }
  return formatToSec(value, 'ms');
}

const CoreVitalsThresholds = {
  LCP: { good: '2.5s', bad: '4.0s' },
  FID: { good: '100ms', bad: '300ms' },
  CLS: { good: '0.1', bad: '0.25' },
};

// eslint-disable-next-line import/no-default-export
export default function CoreVitals({
  data,
  loading,
  displayServiceName,
  serviceName,
  totalPageViews,
  displayTrafficMetric = false,
}: CoreVitalProps) {
  const { lcp, lcpRanks, fid, fidRanks, cls, clsRanks, coreVitalPages } = data || {};

  return (
    <>
      <WebCoreVitalsTitle
        loading={loading}
        coreVitalPages={coreVitalPages}
        totalPageViews={totalPageViews}
        displayTrafficMetric={displayTrafficMetric}
      />
      <EuiSpacer size="s" />
      {displayServiceName && <ServiceName name={serviceName!} />}
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xl" justifyContent={'spaceBetween'} wrap>
        <EuiFlexItem style={{ flexBasis: 380 }}>
          <CoreVitalItem
            title={LCP_LABEL}
            value={formatToMilliseconds(lcp)}
            ranks={lcpRanks}
            loading={loading}
            thresholds={CoreVitalsThresholds.LCP}
            helpLabel={LCP_HELP_LABEL}
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ flexBasis: 380 }}>
          <CoreVitalItem
            title={FID_LABEL}
            value={formatToMilliseconds(fid)}
            ranks={fidRanks}
            loading={loading}
            thresholds={CoreVitalsThresholds.FID}
            helpLabel={FID_HELP_LABEL}
          />
        </EuiFlexItem>
        <EuiFlexItem style={{ flexBasis: 380 }}>
          <CoreVitalItem
            title={CLS_LABEL}
            value={cls?.toFixed(3) ?? null}
            ranks={clsRanks}
            loading={loading}
            thresholds={CoreVitalsThresholds.CLS}
            isCls={true}
            helpLabel={CLS_HELP_LABEL}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
