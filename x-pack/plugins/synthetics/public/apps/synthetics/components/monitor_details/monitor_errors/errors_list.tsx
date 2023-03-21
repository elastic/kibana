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
import { isActiveState } from '../hooks/use_monitor_errors';
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
  const { monitorId: configId } = useParams<{ monitorId: string }>();

  const checkGroups = useMemo(() => {
    return errorStates.map((error) => error.monitor.check_group!);
  }, [errorStates]);

  const { failedSteps } = useErrorFailedStep(checkGroups);

  const isBrowserType = errorStates[0]?.monitor.type === 'browser';

  const history = useHistory();

  const format = useDateFormatForTest();

  const selectedLocation = useSelectedLocation();

  const lastTestRun = errorStates?.sort((a, b) => {
    return moment(b.state.started_at).valueOf() - moment(a.state.started_at).valueOf();
  })?.[0];

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
            configId={configId}
            stateId={item.state?.id!}
            label={formatTestRunAt(item.state!.started_at, format)}
            locationId={selectedLocation?.id}
          />
        );
        const isActive = isActiveState(item);
        if (!isActive || lastTestRun.state.id !== item.state.id) {
          return link;
        }

        return (
          <EuiFlexGroup gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false} className="eui-textNoWrap">
              {link}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBadge iconType="clock" iconSide="right">
                {ACTIVE_LABEL}
              </EuiBadge>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    ...(isBrowserType
      ? [
          {
            field: 'monitor.check_group',
            name: FAILED_STEP_LABEL,
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
        ]
      : []),
    {
      field: 'error.message',
      name: ERROR_MESSAGE_LABEL,
    },
    {
      field: 'state.duration_ms',
      name: ERROR_DURATION_LABEL,
      align: 'right' as const,
      sortable: true,
      render: (value: string, item: PingState) => {
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
        return (
          <EuiText size="s">{formatTestDuration(Number(value) + activeDuration, true)}</EuiText>
        );
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
            `/monitor/${configId}/errors/${state.id}?locationId=${selectedLocation?.id}`
          );
        },
      };
    }
  };

  return (
    <div>
      <EuiSpacer />
      <EuiInMemoryTable
        tableLayout="auto"
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
  locationId?: string;
}) => {
  return `${basePath}/app/synthetics/monitor/${configId}/errors/${stateId}?locationId=${locationId}`;
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

const ACTIVE_LABEL = i18n.translate('xpack.synthetics.active.label', {
  defaultMessage: 'Active',
});
