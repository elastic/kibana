/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useCallback, useMemo, useContext } from 'react';
import { EuiPanel, EuiBadge, EuiBasicTableColumn } from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import { EuiHorizontalRule, EuiInMemoryTable } from '@elastic/eui';
import euiVars from '@elastic/eui/dist/eui_theme_light.json';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { SideEffectContext } from './side_effect_context';
import { ProcessEvent } from '../types';
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

export const Panel = memo(function Event({ className }: { className?: string }) {
  interface ProcessTableView {
    name: string;
    timestamp?: Date;
    event: ProcessEvent;
  }

  const { processNodePositions } = useSelector(selectors.processNodePositionsAndEdgeLineSegments);
  const { timestamp } = useContext(SideEffectContext);

  const processTableView: ProcessTableView[] = useMemo(
    () =>
      [...processNodePositions.keys()].map(processEvent => {
        const { data_buffer } = processEvent;
        const date = new Date(data_buffer.timestamp_utc);
        return {
          name: data_buffer.process_name,
          timestamp: isFinite(date.getTime()) ? date : undefined,
          event: processEvent,
        };
      }),
    [processNodePositions]
  );

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
          time: timestamp(),
          process: processTableViewItem.event,
        },
      });
    },
    [dispatch, timestamp]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<ProcessTableView>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.endpoint.resolver.panel.tabel.row.processNameTitle', {
          defaultMessage: 'Process Name',
        }),
        sortable: true,
        truncateText: true,
        render(name: string) {
          return name === '' ? (
            <EuiBadge color="warning">
              {i18n.translate('xpack.endpoint.resolver.panel.table.row.valueMissingDescription', {
                defaultMessage: 'Value is missing',
              })}
            </EuiBadge>
          ) : (
            name
          );
        },
      },
      {
        field: 'timestamp',
        name: i18n.translate('xpack.endpoint.resolver.panel.tabel.row.timestampTitle', {
          defaultMessage: 'Timestamp',
        }),
        dataType: 'date',
        sortable: true,
        render(eventTimestamp?: Date) {
          return eventTimestamp ? (
            formatter.format(eventTimestamp)
          ) : (
            <EuiBadge color="warning">
              {i18n.translate('xpack.endpoint.resolver.panel.tabel.row.timestampInvalidLabel', {
                defaultMessage: 'invalid',
              })}
            </EuiBadge>
          );
        },
      },
      {
        name: i18n.translate('xpack.endpoint.resolver.panel.tabel.row.actionsTitle', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: i18n.translate(
              'xpack.endpoint.resolver.panel.tabel.row.actions.bringIntoViewButtonLabel',
              {
                defaultMessage: 'Bring into view',
              }
            ),
            description: i18n.translate(
              'xpack.endpoint.resolver.panel.tabel.row.bringIntoViewLabel',
              {
                defaultMessage: 'Bring the process into view on the map.',
              }
            ),
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
        <h4>
          {i18n.translate('xpack.endpoint.resolver.panel.title', {
            defaultMessage: 'Processes',
          })}
        </h4>
      </EuiTitle>
      <HorizontalRule />
      <EuiInMemoryTable<ProcessTableView> items={processTableView} columns={columns} sorting />
    </EuiPanel>
  );
});
