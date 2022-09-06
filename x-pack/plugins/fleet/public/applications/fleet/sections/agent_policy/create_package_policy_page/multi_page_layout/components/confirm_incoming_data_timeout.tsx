/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PackageInfo } from '../../../../../../../../common';

import { useGetDiscoverLogsLinkForAgents } from '../hooks';

import { AgentDataTimedOutBottomBar, NotObscuredByBottomBar } from './bottom_bar';

interface Props {
  agentIds: string[];
  troubleshootLink: string;
  packageInfo?: PackageInfo;
}

export const ConfirmIncomingDataTimeout: React.FunctionComponent<Props> = ({
  agentIds,
  troubleshootLink,
  packageInfo,
}) => {
  const discoverLogsLink = useGetDiscoverLogsLinkForAgents(agentIds);

  return (
    <>
      <EuiTitle>
        <h3>
          <FormattedMessage
            id="xpack.fleet.confirmIncomingData.timeout.title"
            defaultMessage="Confirming data is taking longer than expected"
          />
        </h3>
      </EuiTitle>
      <EuiText>
        <FormattedMessage
          id="xpack.fleet.confirmIncomingData.timeout.body"
          defaultMessage="If the system is not generating data, it may help to generate some to ensure data is being collected correctly. If you're having trouble, see our {troubleshootLink}, or you may check later by viewing {discoverLink}."
          values={{
            troubleshootLink: (
              <EuiLink external href={troubleshootLink} target="_blank">
                <FormattedMessage
                  id="xpack.fleet.confirmIncomingData.timeout.troubleshootLink"
                  defaultMessage="troubleshooting guide"
                />
              </EuiLink>
            ),
            discoverLink: (
              <EuiLink external href={discoverLogsLink ?? ''} target="_blank">
                <FormattedMessage
                  id="xpack.fleet.confirmIncomingData.timeout.discoverLink"
                  defaultMessage="{integration} logs in Discover"
                  values={{ integration: packageInfo?.title ?? '' }}
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <NotObscuredByBottomBar />
      <AgentDataTimedOutBottomBar
        agentIds={agentIds}
        troubleshootLink={troubleshootLink}
        integration={packageInfo?.title}
      />
    </>
  );
};
