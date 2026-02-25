/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useAnomalyDetectionJobsContext } from '../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useLocalStorage } from '../../../hooks/use_local_storage';
import { MLCallout, shouldDisplayMlCallout } from '../../shared/ml_callout';
import { TracesInDiscoverCallout } from './traces_in_discover_callout';

/**
 * Renders the Service inventory callouts (Traces in Discover, ML/anomaly detection).
 * Used above the page header when on the Service inventory page.
 */
export function ServiceInventoryCallouts() {
  const { anomalyDetectionSetupState } = useAnomalyDetectionJobsContext();

  const [userHasDismissedCallout, setUserHasDismissedCallout] = useLocalStorage(
    `apm.userHasDismissedServiceInventoryMlCallout.${anomalyDetectionSetupState}`,
    false
  );

  const displayMlCallout =
    !userHasDismissedCallout && shouldDisplayMlCallout(anomalyDetectionSetupState);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <TracesInDiscoverCallout />
      {displayMlCallout && (
        <EuiFlexItem>
          <MLCallout
            isOnSettingsPage={false}
            anomalyDetectionSetupState={anomalyDetectionSetupState}
            onDismiss={() => setUserHasDismissedCallout(true)}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
