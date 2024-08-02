/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useSelector } from 'react-redux';
import { getHasIntegrationMonitors } from '../../../state/api/has_integration_monitors';
import { monitorListSelector } from '../../../state/selectors';
import { IntegrationDeprecationCallout } from './integration_deprecation_callout';

export const INTEGRATION_DEPRECATION_SESSION_STORAGE_KEY =
  'SYNTHETICS_INTEGRATION_DEPRECATION_HAS_BEEN_DISMISSED';

export const IntegrationDeprecation = () => {
  const monitorList = useSelector(monitorListSelector);
  const noticeHasBeenDismissed =
    window.sessionStorage.getItem(INTEGRATION_DEPRECATION_SESSION_STORAGE_KEY) === 'true';
  const { data, loading } = useFetcher(() => {
    // load it when list is loaded
    if (!noticeHasBeenDismissed && monitorList.isLoaded) {
      return getHasIntegrationMonitors();
    }
    return undefined;
    // FIXME: Dario thinks there is a better way to do this but
    // he's getting tired and maybe the Uptime folks can fix it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monitorList.isLoaded]);
  const hasIntegrationMonitors = !loading && data && data.hasIntegrationMonitors;
  const [shouldShowNotice, setShouldShowNotice] = useState(
    Boolean(hasIntegrationMonitors && !noticeHasBeenDismissed)
  );

  const handleDismissDeprecationNotice = () => {
    window.sessionStorage.setItem(INTEGRATION_DEPRECATION_SESSION_STORAGE_KEY, 'true');
    setShouldShowNotice(false);
  };

  useEffect(() => {
    setShouldShowNotice(Boolean(hasIntegrationMonitors && !noticeHasBeenDismissed));
  }, [hasIntegrationMonitors, noticeHasBeenDismissed]);

  return shouldShowNotice ? (
    <>
      <IntegrationDeprecationCallout
        handleDismissDeprecationNotice={handleDismissDeprecationNotice}
      />
      <EuiSpacer size="s" />
    </>
  ) : null;
};
