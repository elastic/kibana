/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { EuiPopover, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React, { useState, useContext } from 'react';
import { get } from 'lodash';
import { LatestMonitor } from '../../../common/graphql/types';
import { UptimeSettingsContext } from '../../contexts';

interface MonitorListPopoverProps {
  basePath: string;
  monitor: LatestMonitor;
}

export const MonitorListPopover = ({ monitor }: MonitorListPopoverProps) => {
  const [isPopoverVisible, setIsPopoverVisible] = useState<boolean>(false);
  const { basePath, dateRangeStart, dateRangeEnd } = useContext(UptimeSettingsContext);
  const domain = get<string | null>(monitor, 'ping.url.domain', null);

  const apmHref = `${basePath}/app/apm#/services?kuery=${encodeURI(
    `url.domain: "${domain}"`
  )}&rangeFrom=${dateRangeStart}&rangeTo=${dateRangeEnd}`;

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
            <EuiLink href={apmHref} target="_blank">
              <EuiButtonIcon aria-label="WARNINGTHISAPM" iconType="apmApp" size="l" />
            </EuiLink>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content={`${monitor.id.url} Logging integration`}>
            <EuiLink href="" target="_blank">
              <EuiButtonIcon aria-label="WARNINGTHISLOGGING" iconType="loggingApp" size="l" />
            </EuiLink>
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content={`${monitor.id.url} Infra integration`}>
            <EuiLink href="" target="_blank">
              <EuiButtonIcon aria-label="WARNINGTHISINFRA" iconType="infraApp" size="l" />
            </EuiLink>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
