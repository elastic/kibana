/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { enableSynthtraceCapture } from '@kbn/observability-plugin/common';
import { SynthtraceCaptureFab } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import { useMaybeApmParams } from '../../../hooks/use_apm_params';
import { callApmApi } from '../../../services/rest/create_call_apm_api';
import { toQuery } from '../../shared/links/url_helpers';

/**
 * Developer tool, gated behind the off-by-default `observability:enableSynthtraceCapture`
 * advanced setting. Renders a floating button (bottom-right, on every APM page) that
 * captures the APM data behind the current page - i.e. all trace + app-metric data within
 * the current time range and filters - and downloads it as a runnable `@kbn/synthtrace`
 * scenario `.ts` file. The presentation/download/toast plumbing lives in the shared
 * `SynthtraceCaptureFab`; this wrapper only resolves the APM-specific filters + request.
 */
export function CaptureSynthtraceFab() {
  const { core } = useApmPluginContext();
  const { urlParams } = useLegacyUrlParams();
  const { start, end, transactionType, transactionName } = urlParams;
  // `kuery` and `environment` are intentionally stripped from the legacy url params (they live
  // in the typed-router query), so read them straight from the current URL instead.
  const { search } = useLocation();
  const { kuery, environment } = toQuery(search);
  // The page's service scope lives in the URL path, not in the KQL bar; read it when present
  // so a service-scoped page only captures that service rather than everything.
  const serviceParams = useMaybeApmParams('/services/{serviceName}');
  const mobileServiceParams = useMaybeApmParams('/mobile-services/{serviceName}');
  const serviceName = serviceParams?.path.serviceName ?? mobileServiceParams?.path.serviceName;

  const isEnabled = core?.uiSettings?.get<boolean>(enableSynthtraceCapture, false) ?? false;

  return (
    <SynthtraceCaptureFab
      isVisible={isEnabled && Boolean(start) && Boolean(end)}
      toasts={core.notifications.toasts}
      dataTestSubj="apmCaptureSynthtraceScenarioFab"
      onCapture={(signal) =>
        callApmApi('GET /internal/apm/synthtrace_scenario', {
          signal,
          params: {
            query: {
              start: start ?? '',
              end: end ?? '',
              environment: environment ?? 'ENVIRONMENT_ALL',
              kuery: kuery ?? '',
              ...(serviceName ? { serviceName } : {}),
              ...(transactionType ? { transactionType } : {}),
              ...(transactionName ? { transactionName } : {}),
            },
          },
        })
      }
    />
  );
}
