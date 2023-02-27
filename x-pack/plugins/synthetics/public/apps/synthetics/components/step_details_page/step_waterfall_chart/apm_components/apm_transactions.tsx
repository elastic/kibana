/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApmPluginSetupDeps, ApmPluginStartDeps } from '@kbn/apm-plugin/public/plugin';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import React, { useEffect, useState } from 'react';
import { APMTransactionOverviewEmbeddable } from '@kbn/apm-plugin/public';

import { ConfigKey } from '../../../../../../../common/runtime_types';
import { useSelectedMonitor } from '../../../monitor_details/hooks/use_selected_monitor';
import { useJourneySteps } from '../../../monitor_details/hooks/use_journey_steps';
import { useSyntheticsSettingsContext } from '../../../../contexts';

export const ApmTransactions = ({ url, offset = '1d' }: { url?: string; offset?: string }) => {
  const { core, plugins, appMountParameters } = useSyntheticsSettingsContext();
  const { data } = useJourneySteps();
  // By default, we want to show the last 15 minutes of data
  const { gte, lt } = data?.details?.journey?.monitor?.timespan ?? {
    gte: new Date(Date.now() - 15 * 60 * 1000).toDateString(),
    lt: new Date().toISOString(),
  };

  const monitor = useSelectedMonitor();
  const serviceName = monitor?.monitor?.[ConfigKey.APM_SERVICE_NAME];

  const [startServices, setStartServices] = useState<[CoreStart | null, object | null]>([
    null,
    null,
  ]);
  useEffect(() => {
    if (core) {
      core.getStartServices().then((_startServices) => {
        const [coreStart, pluginsStart] = _startServices;
        setStartServices([coreStart, pluginsStart]);
      });
    }
  }, [core]);
  const [coreStart, pluginsStart] = startServices;

  if (!core || !coreStart || !pluginsStart || !plugins || !appMountParameters || !serviceName) {
    return null;
  }

  return (
    <APMTransactionOverviewEmbeddable
      url={url}
      start={gte}
      end={lt}
      offset={offset}
      serviceName={serviceName}
      core={core}
      coreStart={coreStart}
      plugins={plugins as ApmPluginSetupDeps}
      appMountParameters={appMountParameters}
      pluginsStart={pluginsStart as ApmPluginStartDeps}
      observabilityRuleTypeRegistry={plugins.observability.observabilityRuleTypeRegistry}
    />
  );
};
