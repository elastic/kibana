/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiCodeBlock, EuiIcon, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { Ping } from '../../../../common/runtime_types/ping';

const StyledLink = styled(EuiLink)`
  margin-right: 5px;
  margin-left: 5px;
  display: block;
`;

interface Props {
  monitorStatus: Ping | null;
  showTitle?: boolean;
}

export const PingRedirects: React.FC<Props> = ({ monitorStatus, showTitle }) => {
  const monitorUrl = monitorStatus?.url?.full;

  const list = monitorStatus?.http?.response?.redirects;

  return list ? (
    <div data-test-subj="uptimeMonitorPingListRedirectInfo">
      {showTitle && (
        <EuiText size="xs">
          <h3>
            {i18n.translate('xpack.uptime.monitorList.redirects.title', {
              defaultMessage: 'Redirects',
            })}
          </h3>
        </EuiText>
      )}
      <EuiSpacer size="xs" />
      {
        <EuiText>
          {i18n.translate('xpack.uptime.monitorList.redirects.description', {
            defaultMessage: 'Heartbeat followed {number} redirects while executing ping.',
            values: {
              number: list?.length ?? 0,
            },
          })}
        </EuiText>
      }
      <EuiSpacer size="s" />
      <div>
        <StyledLink href={monitorUrl}>{monitorUrl}</StyledLink>
        {list?.map((url: string, ind: number) => (
          <div key={ind}>
            <EuiIcon type="sortDown" />
            <StyledLink href={url}>
              {url} <EuiIcon type={'popout'} size="s" />
            </StyledLink>
          </div>
        ))}
      </div>
    </div>
  ) : null;
};
