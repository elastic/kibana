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
import { i18n } from '@kbn/i18n';
import * as React from 'react';
import { getTestRunDetailLink } from '../common/links/test_details_link';
import { useLocations } from '../../hooks';
import { useSyntheticsSettingsContext } from '../../contexts';
import { JourneyStep, Ping } from '../../../../../common/runtime_types';
import { formatDuration } from '../../utils/formatting';

interface Props {
  checkGroupId?: string;
  summaryDocs?: Ping[] | JourneyStep[] | null;
  journeyStarted?: boolean;
  title?: string;
  configId?: string;
  isCompleted: boolean;
}

export function TestResultHeader({
  checkGroupId,
  title,
  summaryDocs,
  journeyStarted,
  isCompleted,
  configId,
}: Props) {
  const { basePath } = useSyntheticsSettingsContext();
  let duration = 0;
  if (summaryDocs && summaryDocs.length > 0) {
    summaryDocs.forEach((sDoc) => {
      duration += sDoc.monitor.duration?.us ?? 0;
    });
  }

  const { getLocationByLabel } = useLocations();

  const summaryDoc = summaryDocs?.[0] as Ping;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{title ?? TEST_RESULT}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        {isCompleted ? (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge color={summaryDoc?.summary?.down! > 0 ? 'danger' : 'success'}>
                {summaryDoc?.summary?.down! > 0 ? FAILED_LABEL : COMPLETED_LABEL}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.synthetics.monitorManagement.timeTaken', {
                  defaultMessage: 'Took {timeTaken}',
                  values: { timeTaken: formatDuration(duration) },
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiBadge style={{ width: 100 }} color={journeyStarted ? 'primary' : 'warning'}>
                {journeyStarted ? IN_PROGRESS_LABEL : PENDING_LABEL}
              </EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLoadingSpinner />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
      {checkGroupId && configId && isCompleted && (
        <EuiFlexItem grow={false}>
          <EuiLink
            href={getTestRunDetailLink({
              basePath,
              monitorId: configId,
              checkGroup: checkGroupId,
              locationId: getLocationByLabel(summaryDoc?.observer?.geo?.name!)?.id,
            })}
          >
            {VIEW_DETAILS}
          </EuiLink>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

export const PENDING_LABEL = i18n.translate('xpack.synthetics.monitorManagement.pending', {
  defaultMessage: 'PENDING',
});

const TEST_RESULT = i18n.translate('xpack.synthetics.monitorManagement.testResult', {
  defaultMessage: 'Test result',
});

const COMPLETED_LABEL = i18n.translate('xpack.synthetics.monitorManagement.completed', {
  defaultMessage: 'COMPLETED',
});

const FAILED_LABEL = i18n.translate('xpack.synthetics.monitorManagement.failed', {
  defaultMessage: 'FAILED',
});

export const IN_PROGRESS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.inProgress', {
  defaultMessage: 'IN PROGRESS',
});

const VIEW_DETAILS = i18n.translate('xpack.synthetics.monitorManagement.viewTestRunDetails', {
  defaultMessage: 'View test result details',
});
