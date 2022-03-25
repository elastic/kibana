/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButtonIcon,
  EuiTitle,
  EuiFlexItem,
  EuiText,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent, useState } from 'react';
import styled from 'styled-components';
import { JourneyStep } from '../../../../common/runtime_types';
import { STATUS_LABEL } from '../../monitor/ping_list/translations';
import { COLLAPSE_LABEL, EXPAND_LABEL, STEP_NAME_LABEL } from '../translations';
import { StatusBadge } from '../status_badge';
import { StepDetailLink } from '../../common/step_detail_link';
import { VIEW_PERFORMANCE } from '../../monitor/synthetics/translations';
import { StepImage } from './step_image';
import { useExpandedRow } from './use_expanded_row';
import { StepDuration } from './step_duration';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';

export const SpanWithMargin = styled.span`
  margin-right: 16px;
`;

interface Props {
  data: JourneyStep[];
  error?: Error;
  loading: boolean;
  compactView?: boolean;
  showStepDurationTrend?: boolean;
}

interface StepStatusCount {
  failed: number;
  skipped: number;
  succeeded: number;
}

export function isStepEnd(step: JourneyStep) {
  return step.synthetics?.type === 'step/end';
}

function statusMessage(count: StepStatusCount, loading?: boolean) {
  if (loading) {
    return i18n.translate('xpack.uptime.synthetics.journey.loadingSteps', {
      defaultMessage: 'Loading steps ...',
    });
  }
  const total = count.succeeded + count.failed + count.skipped;
  if (count.failed + count.skipped === total) {
    return i18n.translate('xpack.uptime.synthetics.journey.allFailedMessage', {
      defaultMessage: '{total} Steps - all failed or skipped',
      values: { total },
    });
  } else if (count.succeeded === total) {
    return i18n.translate('xpack.uptime.synthetics.journey.allSucceededMessage', {
      defaultMessage: '{total} Steps - all succeeded',
      values: { total },
    });
  }
  return i18n.translate('xpack.uptime.synthetics.journey.partialSuccessMessage', {
    defaultMessage: '{total} Steps - {succeeded} succeeded',
    values: { succeeded: count.succeeded, total },
  });
}

function reduceStepStatus(prev: StepStatusCount, cur: JourneyStep): StepStatusCount {
  if (cur.synthetics?.payload?.status === 'succeeded') {
    prev.succeeded += 1;
    return prev;
  } else if (cur.synthetics?.payload?.status === 'skipped') {
    prev.skipped += 1;
    return prev;
  }
  prev.failed += 1;
  return prev;
}

export const StepsList = ({
  data,
  error,
  loading,
  showStepDurationTrend = true,
  compactView = false,
}: Props) => {
  const steps: JourneyStep[] = data.filter(isStepEnd);

  const { expandedRows, toggleExpand } = useExpandedRow({ steps, allSteps: data, loading });

  const [durationPopoverOpenIndex, setDurationPopoverOpenIndex] = useState<number | null>(null);
  const { basePath } = useUptimeSettingsContext();

  const columns: Array<EuiBasicTableColumn<JourneyStep>> = [
    {
      field: 'synthetics.payload.status',
      name: STATUS_LABEL,
      render: (pingStatus: string, item) => (
        <StatusBadge status={pingStatus} stepNo={item.synthetics?.step?.index!} />
      ),
      mobileOptions: {
        render: (item) => (
          <EuiFlexItem grow={false}>
            <StatusBadge
              isMobile={true}
              status={item.synthetics?.payload?.status}
              stepNo={item.synthetics?.step?.index!}
            />
          </EuiFlexItem>
        ),
        width: '20%',
        header: STATUS_LABEL,
        enlarge: false,
      },
    },
    {
      align: 'left',
      field: 'timestamp',
      name: STEP_NAME_LABEL,
      render: (_timestamp: string, item) => <StepImage step={item} compactView={compactView} />,
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
      name: 'Step duration',
      render: (item: JourneyStep) => {
        return (
          <StepDuration
            step={item}
            durationPopoverOpenIndex={durationPopoverOpenIndex}
            setDurationPopoverOpenIndex={setDurationPopoverOpenIndex}
            showStepDurationTrend={showStepDurationTrend}
            compactView={compactView}
          />
        );
      },
      mobileOptions: {
        header: i18n.translate('xpack.uptime.pingList.stepDurationHeader', {
          defaultMessage: 'Step duration',
        }),
        show: true,
      },
    },
    {
      align: 'left',
      field: 'timestamp',
      name: '',
      mobileOptions: { show: false },
      render: (_val: string, item) =>
        compactView ? (
          <EuiButtonIcon
            href={`${basePath}/app/uptime/journey/${item.monitor.check_group}/step/${item.synthetics?.step?.index}`}
            target="_blank"
            iconType="visArea"
          />
        ) : (
          <StepDetailLink
            checkGroupId={item.monitor.check_group!}
            stepIndex={item.synthetics?.step?.index!}
          >
            {VIEW_PERFORMANCE}
          </StepDetailLink>
        ),
    },
    {
      width: '40px',
      align: RIGHT_ALIGNMENT,
      isExpander: true,
      render: (journeyStep: JourneyStep) => {
        return (
          <EuiButtonIcon
            data-test-subj="uptimeStepListExpandBtn"
            onClick={() => toggleExpand({ journeyStep })}
            aria-label={expandedRows[journeyStep._id] ? COLLAPSE_LABEL : EXPAND_LABEL}
            iconType={expandedRows[journeyStep._id] ? 'arrowUp' : 'arrowDown'}
          />
        );
      },
    },
  ];

  const getRowProps = (item: JourneyStep) => {
    const { monitor } = item;

    return {
      'data-test-subj': `row-${monitor.check_group}`,
      onClick: (evt: MouseEvent) => {
        const targetElem = evt.target as HTMLElement;

        // we dont want to capture image click event
        if (
          targetElem.tagName !== 'IMG' &&
          targetElem.tagName !== 'BUTTON' &&
          targetElem.tagName !== 'CANVAS' &&
          !targetElem.classList.contains('euiButtonEmpty__text') &&
          !targetElem.classList.contains('euiIcon')
        ) {
          toggleExpand({ journeyStep: item });
        }
      },
    };
  };

  return (
    <>
      {!compactView && (
        <EuiTitle size="s">
          <h2>
            {statusMessage(
              steps.reduce(reduceStepStatus, { failed: 0, skipped: 0, succeeded: 0 }),
              loading
            )}
          </h2>
        </EuiTitle>
      )}
      <EuiBasicTable
        compressed={compactView}
        loading={loading}
        columns={columns}
        error={error?.message}
        isExpandable={true}
        hasActions={true}
        items={steps}
        itemIdToExpandedRowMap={expandedRows}
        noItemsMessage={
          loading
            ? i18n.translate('xpack.uptime.pingList.pingsLoadingMesssage', {
                defaultMessage: 'Loading history...',
              })
            : i18n.translate('xpack.uptime.pingList.pingsUnavailableMessage', {
                defaultMessage: 'No history found',
              })
        }
        tableLayout={'auto'}
        rowProps={getRowProps}
      />
    </>
  );
};
