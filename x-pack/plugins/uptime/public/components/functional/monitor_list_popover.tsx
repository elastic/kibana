/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { LatestMonitor } from '../../../common/graphql/types';
import { EuiPopover, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useState } from 'react';
import { get } from 'lodash';

interface MonitorListPopoverProps {
  basePath: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  monitor: LatestMonitor;
}

export const MonitorListPopover = ({ basePath, dateRangeStart, dateRangeEnd, monitor }: MonitorListPopoverProps) => {
  // TODO: support basePath
  const [isPopoverVisible, setIsPopoverVisible] = useState<boolean>(false);
  const domain = get<string | null>(monitor, 'ping.url.domain', null);
  const drs = 'now-15m';
  const dre = 'now';

  return (
    <EuiPopover
      anchorPosition="rightCenter"
      button={
        <EuiButtonIcon
          aria-label="WARNINGTHISMUSTBEUPDATED"
          color="subdued"
          onClick={() => setIsPopoverVisible(true)}
          iconType="boxesVertical"
        />
      }
      closePopover={() => setIsPopoverVisible(false)}
      id="integrationsPopover"
      isOpen={isPopoverVisible}
    >
      <EuiFlexGroup gutterSize="m" direction="column">
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content={`${monitor.id.url} APM integration`}>
            <EuiLink href={`${basePath}/app/apm#/services?kuery=${encodeURI(`url.domain: "${domain}"`)}&rangeFrom=${drs}&rangeTo=${dre}`} target="_blank">
              <EuiButtonIcon aria-label="WARNINGTHISAPM" iconType="apmApp" size="l" />
            </EuiLink>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content={`${monitor.id.url} Logging integration`}>
            <EuiButtonIcon aria-label="WARNINGTHISLOGGING" iconType="loggingApp" size="l" />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content={`${monitor.id.url} Infra integration`}>
            <EuiButtonIcon aria-label="WARNINGTHISINFRA" iconType="infraApp" size="l" />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
