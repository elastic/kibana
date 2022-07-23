/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';

import { useSyntheticsSettingsContext } from '../../../contexts/synthetics_settings_context';
import { JourneyStep } from '../../../../../../common/runtime_types';

import { StatusBadge, parseBadgeStatus } from './status_badge';
import { StepImage } from './step_image';
import { StepDurationText } from './step_duration_text';

interface Props {
  steps: JourneyStep[];
  error?: Error;
  loading: boolean;
  showStepNumber: boolean;
}

export function isStepEnd(step: JourneyStep) {
  return step.synthetics?.type === 'step/end';
}

export const BrowserStepsList = ({ steps, error, loading, showStepNumber = false }: Props) => {
  const { euiTheme } = useEuiTheme();
  const stepEnds: JourneyStep[] = steps.filter(isStepEnd);

  const { basePath } = useSyntheticsSettingsContext();

  const columns: Array<EuiBasicTableColumn<JourneyStep>> = [
    ...(showStepNumber
      ? [
          {
            field: 'synthetics.step.index',
            name: '#',
            render: (stepIndex: number) => (
              <StepNumber stepIndex={stepIndex} steps={stepEnds} euiTheme={euiTheme} />
            ),
          },
        ]
      : []),
    {
      align: 'left',
      field: 'timestamp',
      name: STEP_LABEL,
      render: (_timestamp: string, item) => (
        <StepImage step={item} compactView={true} allStepsLoaded={true} />
      ),
      mobileOptions: {
        render: (item: JourneyStep) => (
          <EuiText>
            <strong>
              {item.synthetics?.step?.index!}. {item.synthetics?.step?.name}
            </strong>
          </EuiText>
        ),
        header: 'Step',
        enlarge: true,
      },
    },
    {
      field: 'synthetics.step.status',
      name: STATUS_LABEL,
      render: (pingStatus: string) => <StatusBadge status={parseBadgeStatus(pingStatus)} />,
    },
    {
      align: 'right',
      name: STEP_DURATION,
      render: (item: JourneyStep) => {
        return <StepDurationText step={item} />;
      },
      mobileOptions: {
        header: STEP_DURATION,
        show: true,
      },
    },
    {
      align: 'right',
      field: 'timestamp',
      name: '',
      mobileOptions: { show: false },
      render: (_val: string, item) => (
        <EuiButtonIcon
          size="s"
          href={`${basePath}/app/uptime/journey/${item.monitor.check_group}/step/${item.synthetics?.step?.index}`}
          target="_blank"
          iconType="apmTrace"
        />
      ),
    },
  ];

  return (
    <>
      <EuiBasicTable
        compressed={true}
        loading={loading}
        columns={columns}
        error={error?.message}
        isExpandable={true}
        hasActions={true}
        items={stepEnds}
        noItemsMessage={
          loading
            ? i18n.translate('xpack.synthetics.monitor.step.loading', {
                defaultMessage: 'Loading steps...',
              })
            : i18n.translate('xpack.synthetics.monitor.step.noDataFound', {
                defaultMessage: 'No data found',
              })
        }
        tableLayout={'auto'}
      />
    </>
  );
};

const StepNumber = ({
  stepIndex,
  steps,
  euiTheme,
}: {
  stepIndex: number;
  steps: JourneyStep[];
  euiTheme: EuiThemeComputed;
}) => {
  const foundIndex = (steps ?? []).findIndex((step) => step?.synthetics?.step?.index === stepIndex);
  const status =
    foundIndex > -1
      ? parseBadgeStatus(steps[foundIndex].synthetics?.step?.status ?? '')
      : parseBadgeStatus('');
  return (
    <EuiText
      css={{ fontWeight: euiTheme.font.weight.bold }}
      size="s"
      color={status === 'failed' ? euiTheme.colors.danger : euiTheme.colors.text}
    >
      {stepIndex}
    </EuiText>
  );
};

const STATUS_LABEL = i18n.translate('xpack.synthetics.monitor.status.label', {
  defaultMessage: 'Status',
});

const STEP_LABEL = i18n.translate('xpack.synthetics.monitor.step.label', {
  defaultMessage: 'Step',
});

const STEP_DURATION = i18n.translate('xpack.synthetics.monitor.step.durationLabel', {
  defaultMessage: 'Duration',
});
