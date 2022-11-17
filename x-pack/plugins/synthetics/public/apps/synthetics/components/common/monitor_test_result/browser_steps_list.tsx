/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { CSSProperties } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { EuiThemeComputed } from '@elastic/eui/src/services/theme/types';

import { JourneyStepScreenshotContainer } from '../screenshot/journey_step_screenshot_container';
import { useSyntheticsSettingsContext } from '../../../contexts/synthetics_settings_context';
import { JourneyStep } from '../../../../../../common/runtime_types';

import { StatusBadge, parseBadgeStatus, getTextColorForMonitorStatus } from './status_badge';
import { StepDurationText } from './step_duration_text';

interface Props {
  steps: JourneyStep[];
  error?: Error;
  loading: boolean;
  showStepNumber: boolean;
  compressed?: boolean;
}

export function isStepEnd(step: JourneyStep) {
  return step.synthetics?.type === 'step/end';
}

export const BrowserStepsList = ({
  steps,
  error,
  loading,
  showStepNumber = false,
  compressed = true,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const stepEnds: JourneyStep[] = steps.filter(isStepEnd);
  const stepLabels = stepEnds.map((stepEnd) => stepEnd?.synthetics?.step?.name ?? '');

  const { basePath } = useSyntheticsSettingsContext();

  const columns: Array<EuiBasicTableColumn<JourneyStep>> = [
    ...(showStepNumber
      ? [
          {
            field: 'synthetics.step.index',
            name: '#',
            render: (stepIndex: number, item: JourneyStep) => (
              <StepNumber stepIndex={stepIndex} step={item} euiTheme={euiTheme} />
            ),
          },
        ]
      : []),
    {
      align: 'left',
      field: 'timestamp',
      name: SCREENSHOT_LABEL,
      render: (_timestamp: string, step) => (
        <JourneyStepScreenshotContainer
          checkGroup={step.monitor.check_group}
          initialStepNo={step.synthetics?.step?.index}
          stepStatus={step.synthetics.payload?.status}
          allStepsLoaded={true}
          stepLabels={stepLabels}
          retryFetchOnRevisit={false}
        />
      ),
      mobileOptions: {
        render: (item: JourneyStep) => (
          <EuiText>
            <strong>
              {item.synthetics?.step?.index!}. {item.synthetics?.step?.name}
            </strong>
          </EuiText>
        ),
        header: SCREENSHOT_LABEL,
        enlarge: true,
      },
    },
    {
      field: 'synthetics.step.name',
      name: STEP_NAME,
      render: (stepName: string, item) => {
        const status = parseBadgeStatus(item.synthetics.step?.status ?? '');

        const textColor = euiTheme.colors[
          getTextColorForMonitorStatus(status)
        ] as CSSProperties['color'];

        return (
          <EuiText color={textColor} size="m">
            {stepName}
          </EuiText>
        );
      },
    },
    {
      field: 'synthetics.step.status',
      name: RESULT_LABEL,
      render: (pingStatus: string) => <StatusBadge status={parseBadgeStatus(pingStatus)} />,
    },
    {
      align: 'left',
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
          aria-label={VIEW_DETAILS}
          title={VIEW_DETAILS}
          size="s"
          href={`${basePath}/app/synthetics/journey/${item.monitor.check_group}/step/${item.synthetics?.step?.index}`}
          target="_self"
          iconType="apmTrace"
        />
      ),
    },
  ];

  return (
    <>
      <EuiBasicTable
        compressed={compressed}
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
  step,
  euiTheme,
}: {
  stepIndex: number;
  step: JourneyStep;
  euiTheme: EuiThemeComputed;
}) => {
  const status = parseBadgeStatus(step.synthetics?.step?.status ?? '');

  return (
    <EuiText
      css={{
        fontWeight: euiTheme.font.weight.bold,
      }}
      size="s"
      color={euiTheme.colors[getTextColorForMonitorStatus(status)] as CSSProperties['color']}
    >
      {stepIndex}
    </EuiText>
  );
};

const RESULT_LABEL = i18n.translate('xpack.synthetics.monitor.result.label', {
  defaultMessage: 'Result',
});

const SCREENSHOT_LABEL = i18n.translate('xpack.synthetics.monitor.screenshot.label', {
  defaultMessage: 'Screenshot',
});

const STEP_NAME = i18n.translate('xpack.synthetics.monitor.stepName.label', {
  defaultMessage: 'Step name',
});

const STEP_DURATION = i18n.translate('xpack.synthetics.monitor.step.duration.label', {
  defaultMessage: 'Duration',
});

const VIEW_DETAILS = i18n.translate('xpack.synthetics.monitor.step.viewDetails', {
  defaultMessage: 'View Details',
});
