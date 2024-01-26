/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';

import type { SearchHit } from '@kbn/es-types';

import type { IncomingDataList } from '../../../common/types/rest_spec/agent';

import { sendGetAgentIncomingData, useLink } from '../../hooks';

export interface InstalledIntegrationPolicy {
  name: string;
  version: string;
}

export const useGetAgentIncomingData = (
  incomingData: IncomingDataList[],
  installedPolicy?: InstalledIntegrationPolicy
) => {
  const enrolledAgents = useMemo(() => incomingData.length, [incomingData.length]);
  const numAgentsWithData = useMemo(
    () =>
      incomingData.reduce((acc, curr) => {
        const agentData = Object.values(curr)[0];
        return !!agentData.data ? acc + 1 : acc;
      }, 0),
    [incomingData]
  );
  const { getAbsolutePath, getHref } = useLink();

  let href;
  let text;
  let message;

  if (!installedPolicy) {
    href = '';
    text = '';
    message = '';
  }

  if (installedPolicy?.name === 'apm') {
    href = getAbsolutePath('/app/apm/tutorial');
    text = i18n.translate('xpack.fleet.confirmIncomingData.installApmAgentButtonText', {
      defaultMessage: 'Install APM Agent',
    });
    message = i18n.translate('xpack.fleet.confirmIncomingData.APMsubtitle', {
      defaultMessage:
        'Next, install APM agents on your hosts to collect data from your applications and services.',
    });
  } else {
    href = getHref('integration_details_assets', {
      pkgkey: `${installedPolicy?.name}-${installedPolicy?.version}`,
    });
    text = i18n.translate('xpack.fleet.confirmIncomingData.viewDataAssetsButtonText', {
      defaultMessage: 'View assets',
    });
    message = i18n.translate('xpack.fleet.confirmIncomingData.subtitle', {
      defaultMessage:
        'Next, analyze your data using our integration assets such as curated views, dashboards and more.',
    });
  }
  const linkButton = { href, text };

  return {
    enrolledAgents,
    numAgentsWithData,
    linkButton,
    message,
  };
};

const POLLING_INTERVAL_MS = 5 * 1000; // 5 sec
const POLLING_TIMEOUT_MS = 5 * 60 * 1000; // 5 min

/**
 * Hook for polling incoming data for the selected agent policy.
 * @param agentIds
 * @returns incomingData, isLoading
 */
export const usePollingIncomingData = (
  agentIds: string[],
  previewData?: boolean,
  stopPollingAfterPreviewLength: number = 0
) => {
  const timeout = useRef<number | undefined>(undefined);
  const [result, setResult] = useState<{
    incomingData: IncomingDataList[];
    dataPreview: SearchHit[];
  }>({
    incomingData: [],
    dataPreview: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasReachedTimeout, setHasReachedTimeout] = useState(false);

  const startedPollingAt = useRef<number>();

  useEffect(() => {
    let isAborted = false;

    const poll = () => {
      timeout.current = window.setTimeout(async () => {
        // On the first run, set an initial timestamp so we can track timeouts
        if (!startedPollingAt.current) {
          startedPollingAt.current = Date.now();
        }

        // If we've been polling for more than 5 minutes, we consider the request "timed out", but
        // don't actually stop polling. This flag just allows consumers of this hook to display an
        // appropriate timeout UI as needed.
        if (Date.now() - startedPollingAt.current > POLLING_TIMEOUT_MS) {
          setHasReachedTimeout(true);
        }

        const { data } = await sendGetAgentIncomingData({ agentsIds: agentIds, previewData });
        if (data?.items) {
          // filter out  agents that have `data = false` and keep polling
          const filtered = data?.items.filter((item) => {
            const key = Object.keys(item)[0];
            return item[key].data === true;
          });

          if (filtered.length > 0) {
            setResult({
              incomingData: filtered,
              dataPreview: data.dataPreview || [],
            });
            setIsLoading(false);
          }
        }

        if (!isAborted) {
          poll();
        }
      }, POLLING_INTERVAL_MS);
    };

    poll();

    const previewLengthReached = result.dataPreview.length >= stopPollingAfterPreviewLength;
    const incomingDataReceived = result.incomingData.length > 0;
    const dataReceived = previewData ? previewLengthReached : incomingDataReceived;

    if (isAborted || dataReceived) {
      clearTimeout(timeout.current);
    }

    return () => {
      isAborted = true;
    };
  }, [agentIds, result, previewData, stopPollingAfterPreviewLength, startedPollingAt]);

  return {
    ...result,
    isLoading,
    hasReachedTimeout,
  };
};
