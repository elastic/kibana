/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { from, where } from '@kbn/esql-composer';
import { SERVICE_ENVIRONMENT } from '@kbn/apm-types';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
} from '../../../../../common/environment_filter_values';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useLocalStorage } from '../../../../hooks/use_local_storage';
import type { ApmPluginStartDeps } from '../../../../plugin';

const buttonLabel = i18n.translate('xpack.apm.apmMainTemplate.euiCallout.buttonLabel', {
  defaultMessage: 'View traces in Discover',
});
const calloutTitle = i18n.translate('xpack.apm.apmMainTemplate.euiCallout.title', {
  defaultMessage: 'Try the new traces experience in Discover',
});
const calloutContent = i18n.translate('xpack.apm.apmMainTemplate.euiCallout.content', {
  defaultMessage:
    'Now you can view and analyse the full-screen waterfall and explore your trace data in context.',
});

const tracesInDiscoverCalloutStorageKey = 'apm.tracesInDiscoverCalloutDismissed';

function useTracesIndex(apmSourcesAccess: ApmSourceAccessPluginStart) {
  const { data } = useFetcher(() => {
    if (!apmSourcesAccess) return;
    return apmSourcesAccess.getApmIndices();
  }, [apmSourcesAccess]);

  return data ? Array.from(new Set([data.span, data.transaction])).join(',') : undefined;
}

function getEsqlQuery(environment: string, tracesIndex: string): string {
  const base = from(tracesIndex);

  if (environment === ENVIRONMENT_ALL_VALUE) {
    return base.toString();
  }

  if (environment === ENVIRONMENT_NOT_DEFINED_VALUE) {
    return base.pipe(where(`${SERVICE_ENVIRONMENT} IS NULL`)).toString();
  }
  return base
    .pipe(
      where(`${SERVICE_ENVIRONMENT} == ?serviceEnvironment`, {
        serviceEnvironment: environment,
      })
    )
    .toString();
}

export function TracesInDiscoverCallout() {
  const { share, core } = useApmPluginContext();
  const {
    services: { apmSourcesAccess },
  } = useKibana<ApmPluginStartDeps>();
  const tracesIndex = useTracesIndex(apmSourcesAccess);

  const {
    query: { environment, rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services', '/service-map');
  const [dismissedCallout, setDismissedCallout] = useLocalStorage(
    tracesInDiscoverCalloutStorageKey,
    false
  );

  const currentSolutionNavId = useObservable(core.chrome.getActiveSolutionNavId$());

  const discoverHref = useMemo(() => {
    if (!tracesIndex) return undefined;
    return share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
      timeRange: {
        from: rangeFrom,
        to: rangeTo,
      },
      query: {
        esql: getEsqlQuery(environment, tracesIndex),
      },
    });
  }, [share.url.locators, tracesIndex, environment, rangeFrom, rangeTo]);

  if (dismissedCallout || !discoverHref || currentSolutionNavId !== 'oblt') {
    return null;
  }

  function dismissCallout() {
    setDismissedCallout(true);
  }

  return (
    <EuiCallOut
      data-test-subj="apmServiceInventoryTracesInDiscoverCallout"
      size="m"
      announceOnMount
      title={calloutTitle}
      iconType="cheer"
      onDismiss={dismissCallout}
    >
      <EuiText size="s">{calloutContent}</EuiText>
      <EuiSpacer size="m" />
      <EuiButton
        data-test-subj="apmServiceInventoryTracesInDiscoverCalloutButton"
        fill
        href={discoverHref}
        aria-label={buttonLabel}
      >
        {buttonLabel}
      </EuiButton>
    </EuiCallOut>
  );
}
