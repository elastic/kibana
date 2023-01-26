/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { MouseEvent, useMemo } from 'react';
import {
  EuiSpacer,
  EuiText,
  EuiInMemoryTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import { useHistory, useParams } from 'react-router-dom';
import moment from 'moment';
import { ErrorDetailsLink } from '../../common/links/error_details_link';
import { useSelectedLocation } from '../hooks/use_selected_location';
import { Ping, PingState } from '../../../../../../common/runtime_types';
import { useErrorFailedStep } from '../hooks/use_error_failed_step';
import {
  formatTestDuration,
  formatTestRunAt,
  useDateFormatForTest,
} from '../../../utils/monitor_test_result/test_time_formats';

export const ErrorsList = ({
  errorStates,
  loading,
}: {
  errorStates: PingState[];
  loading: boolean;
}) => {
  const { monitorId } = useParams<{ monitorId: string }>();

  const checkGroups = useMemo(() => {
    return errorStates.map((error) => error.monitor.check_group!);
  }, [errorStates]);

  const { failedSteps } = useErrorFailedStep(checkGroups);

  const isBrowserType = errorStates[0]?.monitor.type === 'browser';

  const history = useHistory();

  const format = useDateFormatForTest();

  const selectedLocation = useSelectedLocation();

  const columns = [
    {
      field: 'item.state.started_at',
      name: TIMESTAMP_LABEL,
      sortable: (a: PingState) => {
        return moment(a.state.started_at).valueOf();
      },
      render: (value: string, item: PingState) => {
        const link = (
          <ErrorDetailsLink
            configId={monitorId}
            stateId={item.state?.id!}
            label={formatTestRunAt(item.state!.started_at, format)}
          />
        );
        const isActive = isActiveState(item);
        if (!isActive) {
          return link;
        }

        return (
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>{link}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge iconType="clock" iconSide="right">
                Active
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'monitor.check_group',
      name: !isBrowserType ? ERROR_MESSAGE_LABEL : FAILED_STEP_LABEL,
      truncateText: true,
      sortable: (a: PingState) => {
        const failedStep = failedSteps.find(
          (step) => step.monitor.check_group === a.monitor.check_group
        );
        if (!failedStep) {
          return a.monitor.check_group;
        }
        return failedStep.synthetics?.step?.name;
      },
      render: (value: string, item: PingState) => {
        if (!isBrowserType) {
          return <EuiText size="s">{item.error.message ?? '--'}</EuiText>;
        }
        const failedStep = failedSteps.find((step) => step.monitor.check_group === value);
        if (!failedStep) {
          return <>--</>;
        }
        return (
          <EuiText size="s">
            {failedStep.synthetics?.step?.index}. {failedStep.synthetics?.step?.name}
          </EuiText>
        );
      },
    },
    {
      field: 'state.duration_ms',
      name: ERROR_DURATION_LABEL,
      align: 'right' as const,
      sortable: true,
      render: (value: number, item: PingState) => {
        const isActive = isActiveState(item);
        let activeDuration = 0;
        if (item.monitor.timespan) {
          const diff = moment(item.monitor.timespan.lt).diff(
            moment(item.monitor.timespan.gte),
            'millisecond'
          );
          if (isActive) {
            const currentDiff = moment().diff(item['@timestamp']);

            activeDuration = currentDiff < diff ? currentDiff : diff;
          } else {
            activeDuration = diff;
          }
        }
        return <EuiText>{formatTestDuration(value + activeDuration, true)}</EuiText>;
      },
    },
  ];

  const getRowProps = (item: Ping) => {
    const { state } = item;
    if (state?.id) {
      return {
        'data-test-subj': `row-${state.id}`,
        onClick: (evt: MouseEvent) => {
          history.push(
            `/monitor/${monitorId}/errors/${state.id}?locationId=${selectedLocation?.id}`
          );
        },
      };
    }
  };

  return (
    <div>
      <EuiSpacer />
      <EuiInMemoryTable
        tableCaption={ERRORS_LIST_LABEL}
        loading={loading}
        items={errorStates}
        columns={columns}
        rowProps={getRowProps}
        pagination={{ pageSizeOptions: [5, 10, 20, 50, 100] }}
        sorting={{
          sort: {
            field: 'item.state.started_at',
            direction: 'desc',
          },
        }}
      />
    </div>
  );
};

export const getErrorDetailsUrl = ({
  basePath,
  configId,
  stateId,
  locationId,
}: {
  stateId: string;
  basePath: string;
  configId: string;
  locationId: string;
}) => {
  return `${basePath}/app/synthetics/monitor/${configId}/errors/${stateId}?locationId=${locationId}`;
};

const isActiveState = (item: PingState) => {
  const timestamp = item['@timestamp'];
  const interval = moment(item.monitor.timespan?.lt).diff(
    moment(item.monitor.timespan?.gte),
    'milliseconds'
  );
  return moment().diff(moment(timestamp), 'milliseconds') < interval;
};

const ERRORS_LIST_LABEL = i18n.translate('xpack.synthetics.errorsList.label', {
  defaultMessage: 'Errors list',
});

const ERROR_DURATION_LABEL = i18n.translate('xpack.synthetics.errorDuration.label', {
  defaultMessage: 'Error duration',
});

const ERROR_MESSAGE_LABEL = i18n.translate('xpack.synthetics.errorMessage.label', {
  defaultMessage: 'Error message',
});

const FAILED_STEP_LABEL = i18n.translate('xpack.synthetics.failedStep.label', {
  defaultMessage: 'Failed step',
});

const TIMESTAMP_LABEL = i18n.translate('xpack.synthetics.timestamp.label', {
  defaultMessage: '@timestamp',
});
