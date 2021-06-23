/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiButtonIcon, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent } from 'react';
import styled from 'styled-components';
import { Ping } from '../../../../common/runtime_types';
import { STATUS_LABEL } from '../../monitor/ping_list/translations';
import { COLLAPSE_LABEL, EXPAND_LABEL, STEP_NAME_LABEL } from '../translations';
import { StatusBadge } from '../status_badge';
import { StepDetailLink } from '../../common/step_detail_link';
import { VIEW_PERFORMANCE } from '../../monitor/synthetics/translations';
import { StepImage } from './step_image';
import { useExpandedRow } from './use_expanded_row';

export const SpanWithMargin = styled.span`
  margin-right: 16px;
`;

interface Props {
  data: Ping[];
  error?: Error;
  loading: boolean;
}

interface StepStatusCount {
  failed: number;
  skipped: number;
  succeeded: number;
}

function isStepEnd(step: Ping) {
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

function reduceStepStatus(prev: StepStatusCount, cur: Ping): StepStatusCount {
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

export const StepsList = ({ data, error, loading }: Props) => {
  const steps = data.filter(isStepEnd);

  const { expandedRows, toggleExpand } = useExpandedRow({ steps, allPings: data, loading });

  const columns: any[] = [
    {
      field: 'synthetics.payload.status',
      name: STATUS_LABEL,
      render: (pingStatus: string, item: Ping) => (
        <StatusBadge status={pingStatus} stepNo={item.synthetics?.step?.index!} />
      ),
    },
    {
      align: 'left',
      field: 'timestamp',
      name: STEP_NAME_LABEL,
      render: (timestamp: string, item: Ping) => <StepImage step={item} />,
    },
    {
      align: 'left',
      field: 'timestamp',
      name: '',
      render: (val: string, item: Ping) => (
        <StepDetailLink
          checkGroupId={item.monitor.check_group!}
          stepIndex={item.synthetics?.step?.index!}
        >
          {VIEW_PERFORMANCE}
        </StepDetailLink>
      ),
    },
    {
      align: 'right',
      width: '24px',
      isExpander: true,
      render: (ping: Ping) => {
        return (
          <EuiButtonIcon
            data-test-subj="uptimeStepListExpandBtn"
            onClick={() => toggleExpand({ ping })}
            aria-label={expandedRows[ping.docId] ? COLLAPSE_LABEL : EXPAND_LABEL}
            iconType={expandedRows[ping.docId] ? 'arrowUp' : 'arrowDown'}
          />
        );
      },
    },
  ];

  const getRowProps = (item: Ping) => {
    const { monitor } = item;

    return {
      height: '85px',
      'data-test-subj': `row-${monitor.check_group}`,
      onClick: (evt: MouseEvent) => {
        const targetElem = evt.target as HTMLElement;

        // we dont want to capture image click event
        if (targetElem.tagName !== 'IMG' && targetElem.tagName !== 'BUTTON') {
          toggleExpand({ ping: item });
        }
      },
    };
  };

  return (
    <EuiPanel>
      <EuiTitle>
        <h2>
          {statusMessage(
            steps.reduce(reduceStepStatus, { failed: 0, skipped: 0, succeeded: 0 }),
            loading
          )}
        </h2>
      </EuiTitle>
      <EuiBasicTable
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
    </EuiPanel>
  );
};
