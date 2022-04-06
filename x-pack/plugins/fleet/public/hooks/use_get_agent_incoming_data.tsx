/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import type { IncomingDataList } from '../../common/types/rest_spec/agent';

import { sendGetAgentIncomingData, useLink } from './index';

export interface InstalledIntegrationPolicy {
  name: string;
  version: string;
}

export const useGetAgentIncomingData = (
  agentsIds: string[],
  installedPolicy?: InstalledIntegrationPolicy
) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [incomingData, setIncomingData] = useState<IncomingDataList[]>([]);

  useEffect(() => {
    const getIncomingData = async () => {
      const { data } = await sendGetAgentIncomingData({ agentsIds });
      if (data?.items) {
        setIncomingData(data?.items);
        setIsLoading(false);
      }
    };
    if (agentsIds) {
      getIncomingData();
    }
  }, [agentsIds]);

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
    isLoading,
    linkButton,
    message,
  };
};
