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
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import * as React from 'react';
import { formatDuration } from '../../monitor/ping_list/ping_list';
import { JourneyStep, Ping } from '../../../../common/runtime_types';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';

interface Props {
  doc?: JourneyStep;
  summaryDocs?: Ping[] | JourneyStep[] | null;
  journeyStarted?: boolean;
  title?: string;
  isCompleted: boolean;
}

export function TestResultHeader({ doc, title, summaryDocs, journeyStarted, isCompleted }: Props) {
  const { basePath } = useUptimeSettingsContext();
  let duration = 0;
  if (summaryDocs && summaryDocs.length > 0) {
    summaryDocs.forEach((sDoc) => {
      duration += sDoc.monitor.duration!.us;
    });
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{title ?? 'Test run'}</h3>
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
                Took {formatDuration(duration)}
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
