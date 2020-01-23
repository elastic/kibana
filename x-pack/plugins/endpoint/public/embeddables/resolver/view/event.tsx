/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useCallback, useMemo } from 'react';
import { EuiPanel, EuiBadge, EuiBasicTableColumn } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { EuiHorizontalRule, EuiInMemoryTable } from '@elastic/eui';
import euiVars from '@elastic/eui/dist/eui_theme_light.json';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { useResolverDispatch } from './use_resolver_dispatch';
import * as selectors from '../store/selectors';

const HorizontalRule = memo(function HorizontalRule() {
  return (
    <EuiHorizontalRule
      style={{
        /**
         * Cannot use `styled` to override this because the specificity of EuiHorizontalRule's
         * CSS selectors is too high.
         */
        marginLeft: `-${euiVars.euiPanelPaddingModifiers.paddingMedium}`,
        marginRight: `-${euiVars.euiPanelPaddingModifiers.paddingMedium}`,
        /**
         * The default width is 100%, but this should be greater.
         */
        width: 'auto',
      }}
    />
  );
});

export const Event = memo(function Event({ className }: { className?: string }) {
  const { processNodePositions } = useSelector(selectors.processNodePositionsAndEdgeLineSegments);
  interface ProcessTableView {
    name: string;
    timestamp: Date;
  }

  // TODO fix names and structure of this stuff.
  const processTableView = [...processNodePositions.keys()].map(processEvent => {
    const { data_buffer } = processEvent;
    return {
      name: data_buffer.process_name,
      timestamp: new Date(data_buffer.timestamp_utc),
      event: processEvent,
    };
  });

  const formatter = new Intl.DateTimeFormat(i18n.getLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dispatch = useResolverDispatch();

  const handleBringIntoViewClick = useCallback(
    processTableViewItem => {
      dispatch({
        type: 'userBroughtProcessIntoView',
        payload: {
          time: new Date(),
          process: processTableViewItem.event,
        },
      });
    },
    [dispatch]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<ProcessTableView>>>(
    () => [
      {
        field: 'name',
        name: 'Process Name',
        sortable: true,
        truncateText: true,
        render(name: string) {
          return name === '' ? <EuiBadge color="warning">Value is missing</EuiBadge> : name;
        },
      },
      {
        field: 'timestamp',
        name: 'Timestamp',
        dataType: 'date' as const,
        sortable: true,
        render(timestamp: Date) {
          return formatter.format(timestamp);
        },
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'Bring into view',
            description: 'Bring the process into view on the map.',
            type: 'icon',
            icon: 'flag',
            onClick: handleBringIntoViewClick,
          },
        ],
      },
    ],
    [formatter, handleBringIntoViewClick]
  );
  return (
    <EuiPanel className={className}>
      <EuiTitle size="xs">
        <h4>Hey There</h4>
      </EuiTitle>
      <HorizontalRule />
      <EuiInMemoryTable<ProcessTableView>
        items={processTableView}
        columns={columns}
        pagination
        sorting
      />
    </EuiPanel>
  );
});
