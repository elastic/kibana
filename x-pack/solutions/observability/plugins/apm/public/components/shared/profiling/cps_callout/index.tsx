/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiSpacer } from '@elastic/eui';
import { useIsCpsMultiProject } from '@kbn/cps-utils';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useLocalStorage } from '../../../../hooks/use_local_storage';
import { apmCpsManager$, getApmCpsManager } from '../../../../plugin';

export const PROFILING_CPS_CALLOUT_DISMISSED_STORAGE_KEY = 'apmProfilingCpsCalloutDismissed';

/**
 * Warns that the profiling views only use profiling data stored in this project, while the rest
 * of APM follows the project picker. Profiling doesn't support cross-project search
 * (https://github.com/elastic/kibana/issues/297924), so remove this callout once it does.
 *
 * Rendered only while the APM CPS feature flag is on (the published CPS manager is unset
 * otherwise) and the project has linked projects. Pending CPS readiness is treated as no linked
 * projects, so the callout doesn't flash in and out.
 */
export function ProfilingCpsCallout() {
  const cpsManager = useObservable(apmCpsManager$, getApmCpsManager());
  const isCpsMultiProject = useIsCpsMultiProject(cpsManager);
  const [isDismissed, setIsDismissed] = useLocalStorage(
    PROFILING_CPS_CALLOUT_DISMISSED_STORAGE_KEY,
    false
  );

  if (!isCpsMultiProject || isDismissed) {
    return null;
  }

  return (
    <>
      <KbnWarningCallout
        announceOnMount
        data-test-subj="apmProfilingCpsCallout"
        title={i18n.translate('xpack.apm.profiling.cpsCallout.title', {
          defaultMessage: 'Profiling only uses data from this project',
        })}
        text={i18n.translate('xpack.apm.profiling.cpsCallout.description', {
          defaultMessage:
            "Profiling doesn't support cross-project search. The rest of this page follows your project selection, but profiling data in linked projects isn't shown.",
        })}
        onDismiss={() => setIsDismissed(true)}
        dismissButtonProps={{ 'data-test-subj': 'apmProfilingCpsCalloutDismissButton' }}
      />
      <EuiSpacer />
    </>
  );
}
