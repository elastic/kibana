/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState, useEffect } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { Ping } from '../../../../common/runtime_types';
import { pruneJourneyState } from '../../../state/actions/journey';
import { clearPings } from '../../../state/actions';
import { STATUS_LABEL } from '../../monitor/ping_list/translations';
import { PingStatusColumn } from '../../monitor/ping_list/columns/ping_status';
import { PingTimestamp } from '../../monitor/ping_list/columns/ping_timestamp';
import { ExpandRowColumn } from '../../monitor/ping_list/columns/expand_row';
import { STEP_NAME_LABEL } from '../translations';

export const SpanWithMargin = styled.span`
  margin-right: 16px;
`;

export const StepsList = ({ data, error, loading }) => {
  const dispatch = useDispatch();

  const history = useHistory();

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

  const columns = [
    {
      field: 'monitor.status',
      name: STATUS_LABEL,
      render: (pingStatus: string, item: Ping) => (
        <PingStatusColumn pingStatus={pingStatus} item={item} />
      ),
    },

    {
      align: 'left',
      field: 'timestamp',
      name: STEP_NAME_LABEL,
      render: (timestamp: string, item: Ping) => (
        <PingTimestamp timestamp={timestamp} ping={item} />
      ),
    },

    {
      align: 'right',
      width: '24px',
      isExpander: true,
      render: (item: Ping) => (
        <ExpandRowColumn
          item={item}
          expandedRows={expandedRows}
          setExpandedRows={setExpandedRows}
        />
      ),
    },
  ];

  const getRowProps = (item: Ping) => {
    const { monitor } = item;
    return {
      'data-test-subj': `row-${monitor.check_group}`,
      onClick: () => {
        history.push(`/journey/${monitor.check_group}/steps`);
      },
    };
  };

  return (
    <EuiPanel>
      <EuiBasicTable
        loading={loading}
        columns={columns}
        error={error?.message}
        isExpandable={true}
        hasActions={true}
        items={data}
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
