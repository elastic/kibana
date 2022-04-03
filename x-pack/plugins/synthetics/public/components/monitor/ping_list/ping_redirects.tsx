/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiListGroup, EuiListGroupItemProps, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { Ping } from '../../../../common/runtime_types/ping';

const ListGroup = styled(EuiListGroup)`
  &&& {
    a {
      padding-left: 0;
    }
  }
`;

interface Props {
  monitorStatus: Ping | null;
  showTitle?: boolean;
}

export const PingRedirects: React.FC<Props> = ({ monitorStatus, showTitle }) => {
  const monitorUrl = monitorStatus?.url?.full;

  const list = monitorStatus?.http?.response?.redirects;

  const listOfRedirects: EuiListGroupItemProps[] = [
    {
      label: monitorUrl,
      href: monitorUrl,
      iconType: 'globe',
      size: 's',
      target: '_blank',
      extraAction: {
        color: 'text',
        iconType: 'popout',
        iconSize: 's',
        alwaysShow: true,
        'aria-label': i18n.translate('xpack.uptime.monitorList.redirects.openWindow', {
          defaultMessage: 'Link will open in new window.',
        }),
      },
    },
  ];

  (list ?? []).forEach((url: string) => {
    listOfRedirects.push({
      label: url,
      href: url,
      iconType: 'sortDown',
      size: 's',
      target: '_blank',
      extraAction: {
        color: 'text',
        iconType: 'popout',
        iconSize: 's',
        'aria-label': i18n.translate('xpack.uptime.monitorList.redirects.openWindow', {
          defaultMessage: 'Link will open in new window.',
        }),
        alwaysShow: true,
      },
    });
  });

  const Panel = showTitle ? EuiPanel : 'div';

  return list ? (
    <Panel data-test-subj="uptimeMonitorPingListRedirectInfo">
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
      <ListGroup gutterSize={'none'} listItems={listOfRedirects} />
    </Panel>
  ) : null;
};
