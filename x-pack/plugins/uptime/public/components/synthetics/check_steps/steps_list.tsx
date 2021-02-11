/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState, useEffect, MouseEvent } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { Ping } from '../../../../common/runtime_types';
import { pruneJourneyState } from '../../../state/actions/journey';
import { clearPings } from '../../../state/actions';
import { STATUS_LABEL } from '../../monitor/ping_list/translations';
import { STEP_NAME_LABEL } from '../translations';
import { ExpandRowColumn, toggleExpand } from './expand_row_col';
import { StatusBadge } from '../status_badge';
import { StepDetailLink } from '../../common/step_detail_link';
import { VIEW_PERFORMANCE } from '../../monitor/synthetics/translations';
import { StepImage } from './step_image';

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

function statusMessage(count: StepStatusCount) {
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
  const dispatch = useDispatch();

  const steps = data.filter(isStepEnd);

  const pruneJourneysCallback = useCallback(
    (checkGroups: string[]) => dispatch(pruneJourneyState(checkGroups)),
    [dispatch]
  );

  const [expandedRows, setExpandedRows] = useState<Record<string, JSX.Element>>({});

  const expandedIdsToRemove = JSON.stringify(
    Object.keys(expandedRows).filter((e) => !data.some(({ docId }) => docId === e))
  );

  useEffect(() => {
    return () => {
      dispatch(clearPings());
    };
  }, [dispatch]);

  useEffect(() => {
    const parsed = JSON.parse(expandedIdsToRemove);
    if (parsed.length) {
      parsed.forEach((docId: string) => {
        delete expandedRows[docId];
      });
      setExpandedRows(expandedRows);
    }
  }, [expandedIdsToRemove, expandedRows]);

  const expandedCheckGroups = data
    .filter((p: Ping) => Object.keys(expandedRows).some((f) => p.docId === f))
    .map(({ monitor: { check_group: cg } }) => cg);

  const expandedCheckGroupsStr = JSON.stringify(expandedCheckGroups);

  useEffect(() => {
    pruneJourneysCallback(JSON.parse(expandedCheckGroupsStr));
  }, [pruneJourneysCallback, expandedCheckGroupsStr]);

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
      width: '250px',
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
      render: (item: Ping) => {
        return (
          <ExpandRowColumn
            ping={item}
            browserConsole={
              data.find(
                (step) =>
                  step.synthetics?.type === 'journey/browserconsole' &&
                  step.synthetics?.step?.index! === item.synthetics?.step?.index
              )?.synthetics?.payload?.text
            }
            expandedRows={expandedRows}
            setExpandedRows={setExpandedRows}
          />
        );
      },
    },
  ];

  const getRowProps = (item: Ping) => {
    const { monitor } = item;

    return {
      'data-test-subj': `row-${monitor.check_group}`,
      onClick: (evt: MouseEvent) => {
        const targetElem = evt.target as HTMLElement;

        // we dont want to capture image click event
        if (targetElem.tagName !== 'IMG' && targetElem.tagName !== 'BUTTON') {
          toggleExpand({ ping: item, expandedRows, setExpandedRows });
        }
      },
    };
  };

  return (
    <EuiPanel>
      <EuiTitle>
        <h2>
          {statusMessage(steps.reduce(reduceStepStatus, { failed: 0, skipped: 0, succeeded: 0 }))}
        </h2>
      </EuiTitle>
      <EuiBasicTable
        loading={loading}
        columns={columns}
        error={error?.message}
        isExpandable={true}
        hasActions={true}
        items={steps}
        itemId="docId"
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
