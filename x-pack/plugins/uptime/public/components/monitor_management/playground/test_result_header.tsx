/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import * as React from 'react';
import { deviceMap } from './test_devices';
import { formatDuration } from '../../monitor/ping_list/ping_list';
import { JourneyStep, Ping } from '../../../../common/runtime_types';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';
import tabletSvg from './tablet-svgrepo-com.svg';
import mobileSvg from './mobile-svg.svg';
import laptopSvg from './laptop-svg.svg';

const deviceIcons: Record<string, string> = {
  smartphone: mobileSvg,
  tablet: tabletSvg,
  laptop: laptopSvg,
};

interface Props {
  doc?: JourneyStep;
  summaryDocs?: Ping[] | JourneyStep[] | null;
  journeyStarted?: boolean;
  index?: number;
  device?: string;
  monitorType: string;
  title?: string;
  isCompleted: boolean;
}

export function TestResultHeader({
  index,
  device,
  doc,
  title,
  summaryDocs,
  journeyStarted,
  monitorType,
  isCompleted,
}: Props) {
  const { basePath } = useUptimeSettingsContext();

  let testTitle = title;

  if (!testTitle) {
    testTitle = 'Test run ' + index || '';
    if (device !== 'laptop' && device) {
      testTitle += '-' + deviceMap[device];
    }
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      {monitorType === 'browser' && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={deviceIcons[device]} size="m" />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{testTitle}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        {isCompleted ? (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge color="success">COMPLETED</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                Took{' '}
                {formatDuration(
                  (summaryDocs ?? []).reduce((prev, curr) => curr.monitor.duration!.us + prev, 0)
                )}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge style={{ width: 100 }} color={journeyStarted ? 'primary' : 'warning'}>
                {journeyStarted ? 'IN PROGRESS' : 'PENDING'}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLoadingSpinner />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      {doc && (
        <EuiFlexItem grow={false}>
          <EuiLink
            href={`${basePath}/app/uptime/journey/${doc.monitor.check_group}/steps`}
            target="_blank"
          >
            View test result details
          </EuiLink>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
