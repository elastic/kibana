/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { encode } from 'rison-node';
import moment from 'moment';

import { useUiTracker, useLinkProps } from '@kbn/observability-plugin/public';
import { LogEntry, LogEntryContext } from '../../../../../../common/log_entry';
import { TimeRange } from '../../../../../../common/time';
import {
  getFriendlyNameForPartitionId,
  partitionField,
} from '../../../../../../common/log_analysis';
import { ViewLogInContext } from '../../../../../containers/logs/view_log_in_context';
import {
  LogEntryColumn,
  LogEntryFieldColumn,
  LogEntryMessageColumn,
  LogEntryRowWrapper,
  LogEntryTimestampColumn,
} from '../../../../../components/logging/log_text_stream';
import { LogColumnConfiguration } from '../../../../../utils/source_configuration';
import { LogEntryContextMenu } from '../../../../../components/logging/log_text_stream/log_entry_context_menu';

export const exampleMessageScale = 'medium' as const;
export const exampleTimestampFormat = 'dateTime' as const;

export const CategoryExampleMessage: React.FunctionComponent<{
  id: string;
  dataset: string;
  message: string;
  timeRange: TimeRange;
  timestamp: number;
  tiebreaker: number;
  context: LogEntryContext;
}> = ({ id, dataset, message, timestamp, timeRange, tiebreaker, context }) => {
  const trackMetric = useUiTracker({ app: 'infra_logs' });
  const [, { setContextEntry }] = useContext(ViewLogInContext.Context);
  // handle special cases for the dataset value
  const humanFriendlyDataset = getFriendlyNameForPartitionId(dataset);

  const [isHovered, setIsHovered] = useState<boolean>(false);
  const setHovered = useCallback(() => setIsHovered(true), []);
  const setNotHovered = useCallback(() => setIsHovered(false), []);

  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const viewInStreamLinkProps = useLinkProps({
    app: 'logs',
    pathname: 'stream',
    search: {
      logPosition: encode({
        end: moment(timeRange.endTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        position: { tiebreaker, time: timestamp },
        start: moment(timeRange.startTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        streamLive: false,
      }),
      flyoutOptions: encode({
        surroundingLogsId: id,
      }),
      logFilter: encode({
        expression: `${partitionField}: ${dataset}`,
        kind: 'kuery',
      }),
    },
  });

  return (
    <LogEntryRowWrapper
      scale={exampleMessageScale}
      onMouseEnter={setHovered}
      onMouseLeave={setNotHovered}
    >
      <LogEntryColumn {...columnWidths[timestampColumnId]}>
        <LogEntryTimestampColumn format={exampleTimestampFormat} time={timestamp} />
      </LogEntryColumn>
      <LogEntryColumn {...columnWidths[messageColumnId]}>
        <LogEntryMessageColumn
          columnValue={{
            columnId: messageColumnId,
            message: [{ field: 'message', value: [message], highlights: [] }],
          }}
          highlights={noHighlights}
          isActiveHighlight={false}
          wrapMode="none"
        />
      </LogEntryColumn>
      <LogEntryColumn {...columnWidths[datasetColumnId]}>
        <LogEntryFieldColumn
          columnValue={{
            columnId: datasetColumnId,
            field: 'event.dataset',
            value: [humanFriendlyDataset],
            highlights: [],
          }}
          highlights={noHighlights}
          isActiveHighlight={false}
          wrapMode="none"
        />
      </LogEntryColumn>
      <LogEntryColumn {...columnWidths[iconColumnId]}>
        {isHovered || isMenuOpen ? (
          <LogEntryContextMenu
            isOpen={isMenuOpen}
            onOpen={openMenu}
            onClose={closeMenu}
            items={[
              {
                label: i18n.translate('xpack.infra.logs.categoryExample.viewInStreamText', {
                  defaultMessage: 'View in stream',
                }),
                onClick: viewInStreamLinkProps.onClick!,
                href: viewInStreamLinkProps.href,
              },
              {
                label: i18n.translate('xpack.infra.logs.categoryExample.viewInContextText', {
                  defaultMessage: 'View in context',
                }),
                onClick: () => {
                  const logEntry: LogEntry = {
                    id,
                    index: '', // TODO: use real index when loading via async search
                    context,
                    cursor: { time: timestamp, tiebreaker },
                    columns: [],
                  };
                  trackMetric({ metric: 'view_in_context__categories' });

                  setContextEntry(logEntry);
                },
              },
            ]}
          />
        ) : null}
      </LogEntryColumn>
    </LogEntryRowWrapper>
  );
};

const noHighlights: never[] = [];
const timestampColumnId = 'category-example-timestamp-column' as const;
const messageColumnId = 'category-examples-message-column' as const;
const datasetColumnId = 'category-examples-dataset-column' as const;
const iconColumnId = 'category-examples-icon-column' as const;

const columnWidths = {
  [timestampColumnId]: {
    growWeight: 0,
    shrinkWeight: 0,
    // w_count + w_trend - w_padding = 120 px + 220 px - 8 px
    baseWidth: '332px',
  },
  [messageColumnId]: {
    growWeight: 1,
    shrinkWeight: 0,
    baseWidth: '0%',
  },
  [datasetColumnId]: {
    growWeight: 0,
    shrinkWeight: 0,
    // w_dataset + w_max_anomaly + w_expand - w_padding = 200 px + 160 px + 40 px + 40 px - 8 px
    baseWidth: '400px',
  },
  [iconColumnId]: {
    growWeight: 0,
    shrinkWeight: 0,
    baseWidth: '32px',
  },
};

export const exampleMessageColumnConfigurations: LogColumnConfiguration[] = [
  {
    timestampColumn: {
      id: timestampColumnId,
    },
  },
  {
    messageColumn: {
      id: messageColumnId,
    },
  },
  {
    fieldColumn: {
      field: 'event.dataset',
      id: datasetColumnId,
    },
  },
];
