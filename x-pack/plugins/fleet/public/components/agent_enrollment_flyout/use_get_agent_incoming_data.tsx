/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';

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
    href = getAbsolutePath('/app/home#/tutorial/apm');
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

/**
 * Hook for polling incoming data for the selected agent policy.
 * @param agentIds
 * @returns incomingData, isLoading
 */
const POLLING_INTERVAL_MS = 5 * 1000; // 5 sec

export const usePollingIncomingData = (agentsIds: string[]) => {
  const timeout = useRef<number | undefined>(undefined);
  const [incomingData, setIncomingData] = useState<IncomingDataList[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isAborted = false;

    const poll = () => {
      timeout.current = window.setTimeout(async () => {
        const { data } = await sendGetAgentIncomingData({ agentsIds });

        if (data?.items) {
          // filter out agents that have `data = false` and keep polling
          const filtered = data?.items.filter((item) => {
            const key = Object.keys(item)[0];
            return item[key].data === true;
          });

          if (filtered.length > 0) {
            setIncomingData(filtered);
            setIsLoading(false);
          }
        }
        if (!isAborted) {
          poll();
        }
      }, POLLING_INTERVAL_MS);
    };

    poll();
    if (isAborted || incomingData.length > 0) clearTimeout(timeout.current);

    return () => {
      isAborted = true;
    };
  }, [agentsIds, incomingData]);

  return { incomingData, isLoading };
};
