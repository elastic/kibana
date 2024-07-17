/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo, useRef } from 'react';
import { FeatureFeedbackButton } from '@kbn/observability-shared-plugin/public';
import { AnomaliesTable } from '../../../ml/anomaly_detection/anomalies_table/anomalies_table';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useDatePickerContext } from '../../hooks/use_date_picker';
import { useRequestObservable } from '../../hooks/use_request_observable';
import { KibanaEnvironmentContext } from '../../../../hooks/use_kibana';
import { INFRA_ML_FLYOUT_FEEDBACK_LINK } from '../../../ml/anomaly_detection/flyout_home';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';

export const Anomalies = () => {
  const ref = useRef<HTMLDivElement>(null);
  const { isActiveTab } = useTabSwitcherContext();
  const { request$ } = useRequestObservable();
  const { getParsedDateRange } = useDatePickerContext();
  const { asset, overrides } = useAssetDetailsRenderPropsContext();
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useContext(KibanaEnvironmentContext);
  const { onClose = () => {} } = overrides?.anomalies ?? {};

  const parsedDateRange = useMemo(() => getParsedDateRange(), [getParsedDateRange]);

  return (
    <div ref={ref}>
      <AnomaliesTable
        closeFlyout={onClose}
        hostName={asset.name}
        dateRange={parsedDateRange}
        hideDatePicker
        fetcherOpts={{
          autoFetch: isActiveTab('anomalies'),
          requestObservable$: request$,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
        }}
      >
        <FeatureFeedbackButton
          data-test-subj="infraMLHostFlyoutFeedbackLink"
          formUrl={INFRA_ML_FLYOUT_FEEDBACK_LINK}
          kibanaVersion={kibanaVersion}
          isCloudEnv={isCloudEnv}
          isServerlessEnv={isServerlessEnv}
          nodeType={'host'}
        />
      </div>
    </div>
  );
};
