/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { from, where } from '@kbn/esql-composer';
import { SERVICE_ENVIRONMENT } from '@kbn/apm-types';
import type { SolutionId } from '@kbn/core-chrome-browser/src/project_navigation';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import { ENVIRONMENT_ALL_VALUE } from '../../../../../common/environment_filter_values';
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
  const [tracesIndex, setTracesIndex] = useState<string | undefined>();
  useEffect(() => {
    apmSourcesAccess.getApmIndices().then((indices) => {
      setTracesIndex(Array.from(new Set([indices.span, indices.transaction])).join(','));
    });
  }, [apmSourcesAccess]);
  return tracesIndex;
}

function useSolutionId(spaces: SpacesApi | undefined) {
  const [solutionId, setSolutionId] = useState<string | undefined>();
  useEffect(() => {
    spaces?.getActiveSpace().then((space) => setSolutionId(space?.solution));
  }, [spaces]);
  return solutionId;
}

export function TracesInDiscoverCallout() {
  const { share } = useApmPluginContext();
  const obltSolutionId: SolutionId = 'oblt';
  const {
    services: { apmSourcesAccess, spaces },
  } = useKibana<ApmPluginStartDeps>();
  const tracesIndex = useTracesIndex(apmSourcesAccess);
  const solutionId = useSolutionId(spaces);
  const {
    query: { environment, rangeFrom, rangeTo },
  } = useAnyOfApmParams('/services', '/service-map');
  const [dismissedCallout, setDismissedCallout] = useLocalStorage(
    tracesInDiscoverCalloutStorageKey,
    false
  );

  const discoverHref = useMemo(() => {
    if (!tracesIndex) return undefined;
    share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
      timeRange: {
        from: rangeFrom,
        to: rangeTo,
      },
      query: {
        esql: from(tracesIndex)
          .pipe(
            ...(environment !== ENVIRONMENT_ALL_VALUE
              ? [
                  where(`${SERVICE_ENVIRONMENT} == ?serviceEnvironment`, {
                    serviceEnvironment: environment,
                  }),
                ]
              : [])
          )
          .toString(),
      },
    });
  }, [share.url.locators, tracesIndex, environment, rangeFrom, rangeTo]);

  if (dismissedCallout || !discoverHref || solutionId !== obltSolutionId) {
    return null;
  }

  function dismissCallout() {
    setDismissedCallout(true);
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        size="m"
        announceOnMount
        title={calloutTitle}
        iconType="cheer"
        onDismiss={dismissCallout}
      >
        <EuiText size="s">{calloutContent}</EuiText>
        <EuiSpacer size="m" />
        <EuiButton
          data-test-subj="apmApmMainTemplateViewTracesInDiscoverButton"
          fill
          href={discoverHref}
          aria-label={buttonLabel}
        >
          {buttonLabel}
        </EuiButton>
      </EuiCallOut>
    </>
  );
}
