/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback, useState } from 'react';
import moment from 'moment';
import { encode } from 'rison-node';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '../../../../../../../observability/public';
import { getFriendlyNameForPartitionId } from '../../../../../../common/log_analysis';
import {
  LogEntryColumn,
  LogEntryFieldColumn,
  LogEntryMessageColumn,
  LogEntryRowWrapper,
  LogEntryTimestampColumn,
  LogEntryContextMenu,
  LogEntryColumnWidths,
  iconColumnId,
} from '../../../../../components/logging/log_text_stream';
import {
  LogColumnHeadersWrapper,
  LogColumnHeader,
} from '../../../../../components/logging/log_text_stream/column_headers';
import { useLinkProps } from '../../../../../hooks/use_link_props';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { partitionField } from '../../../../../../common/log_analysis/job_parameters';
import { getEntitySpecificSingleMetricViewerLink } from '../../../../../components/logging/log_analysis_results/analyze_in_ml_button';
import { LogEntryRateExample } from '../../../../../../common/http_api/log_analysis/results';
import {
  LogColumnConfiguration,
  isTimestampLogColumnConfiguration,
  isFieldLogColumnConfiguration,
  isMessageLogColumnConfiguration,
} from '../../../../../utils/source_configuration';
import { localizedDate } from '../../../../../../common/formatters/datetime';

export const exampleMessageScale = 'medium' as const;
export const exampleTimestampFormat = 'time' as const;

const MENU_LABEL = i18n.translate('xpack.infra.logAnomalies.logEntryExamplesMenuLabel', {
  defaultMessage: 'View actions for log entry',
});

const VIEW_IN_STREAM_LABEL = i18n.translate(
  'xpack.infra.logs.analysis.logEntryExamplesViewInStreamLabel',
  {
    defaultMessage: 'View in stream',
  }
);

const VIEW_ANOMALY_IN_ML_LABEL = i18n.translate(
  'xpack.infra.logs.analysis.logEntryExamplesViewAnomalyInMlLabel',
  {
    defaultMessage: 'View anomaly in machine learning',
  }
);

type Props = LogEntryRateExample & {
  timeRange: TimeRange;
  jobId: string;
};

export const LogEntryRateExampleMessage: React.FunctionComponent<Props> = ({
  id,
  dataset,
  message,
  timestamp,
  tiebreaker,
  timeRange,
  jobId,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const setItemIsHovered = useCallback(() => setIsHovered(true), []);
  const setItemIsNotHovered = useCallback(() => setIsHovered(false), []);

  // the dataset must be encoded for the field column and the empty value must
  // be turned into a user-friendly value
  const encodedDatasetFieldValue = useMemo(
    () => JSON.stringify(getFriendlyNameForPartitionId(dataset)),
    [dataset]
  );

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

  const viewAnomalyInMachineLearningLinkProps = useLinkProps(
    getEntitySpecificSingleMetricViewerLink(jobId, timeRange, {
      [partitionField]: dataset,
    })
  );

  const menuItems = useMemo(() => {
    if (!viewInStreamLinkProps.onClick || !viewAnomalyInMachineLearningLinkProps.onClick) {
      return undefined;
    }

    return [
      {
        label: VIEW_IN_STREAM_LABEL,
        onClick: viewInStreamLinkProps.onClick,
        href: viewInStreamLinkProps.href,
      },
      {
        label: VIEW_ANOMALY_IN_ML_LABEL,
        onClick: viewAnomalyInMachineLearningLinkProps.onClick,
        href: viewAnomalyInMachineLearningLinkProps.href,
      },
    ];
  }, [viewInStreamLinkProps, viewAnomalyInMachineLearningLinkProps]);

  return (
    <LogEntryRowWrapper
      scale={exampleMessageScale}
      onMouseEnter={setItemIsHovered}
      onMouseLeave={setItemIsNotHovered}
    >
      <LogEntryColumn {...columnWidths[timestampColumnId]}>
        <LogEntryTimestampColumn format={exampleTimestampFormat} time={timestamp} />
      </LogEntryColumn>
      <LogEntryColumn {...columnWidths[messageColumnId]}>
        <LogEntryMessageColumn
          columnValue={{
            columnId: messageColumnId,
            message: [{ field: 'message', value: message, highlights: [] }],
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
            value: encodedDatasetFieldValue,
            highlights: [],
          }}
          highlights={noHighlights}
          isActiveHighlight={false}
          wrapMode="none"
        />
      </LogEntryColumn>
      <LogEntryColumn
        key="logColumn iconLogColumn iconLogColumn:details"
        {...columnWidths[iconColumnId]}
      >
        {(isHovered || isMenuOpen) && menuItems ? (
          <LogEntryContextMenu
            aria-label={MENU_LABEL}
            isOpen={isMenuOpen}
            onOpen={openMenu}
            onClose={closeMenu}
            items={menuItems}
          />
        ) : null}
      </LogEntryColumn>
    </LogEntryRowWrapper>
  );
};

const noHighlights: never[] = [];
const timestampColumnId = 'log-entry-example-timestamp-column' as const;
const messageColumnId = 'log-entry-examples-message-column' as const;
const datasetColumnId = 'log-entry-examples-dataset-column' as const;

const DETAIL_FLYOUT_ICON_MIN_WIDTH = 32;
const COLUMN_PADDING = 8;

export const columnWidths: LogEntryColumnWidths = {
  [timestampColumnId]: {
    growWeight: 0,
    shrinkWeight: 0,
    // w_score - w_padding = 130 px  - 8 px
    baseWidth: '122px',
  },
  [messageColumnId]: {
    growWeight: 1,
    shrinkWeight: 0,
    baseWidth: '0%',
  },
  [datasetColumnId]: {
    growWeight: 0,
    shrinkWeight: 0,
    baseWidth: '250px',
  },
  [iconColumnId]: {
    growWeight: 0,
    shrinkWeight: 0,
    baseWidth: `${DETAIL_FLYOUT_ICON_MIN_WIDTH + 2 * COLUMN_PADDING}px`,
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

export const LogEntryRateExampleMessageHeaders: React.FunctionComponent<{
  dateTime: number;
}> = ({ dateTime }) => {
  return (
    <LogEntryRateExampleMessageHeadersWrapper>
      <>
        {exampleMessageColumnConfigurations.map((columnConfiguration) => {
          if (isTimestampLogColumnConfiguration(columnConfiguration)) {
            return (
              <LogColumnHeader
                key={columnConfiguration.timestampColumn.id}
                columnWidth={columnWidths[columnConfiguration.timestampColumn.id]}
                data-test-subj="logColumnHeader timestampLogColumnHeader"
              >
                {localizedDate(dateTime)}
              </LogColumnHeader>
            );
          } else if (isMessageLogColumnConfiguration(columnConfiguration)) {
            return (
              <LogColumnHeader
                columnWidth={columnWidths[columnConfiguration.messageColumn.id]}
                data-test-subj="logColumnHeader messageLogColumnHeader"
                key={columnConfiguration.messageColumn.id}
              >
                Message
              </LogColumnHeader>
            );
          } else if (isFieldLogColumnConfiguration(columnConfiguration)) {
            return (
              <LogColumnHeader
                columnWidth={columnWidths[columnConfiguration.fieldColumn.id]}
                data-test-subj="logColumnHeader fieldLogColumnHeader"
                key={columnConfiguration.fieldColumn.id}
              >
                {columnConfiguration.fieldColumn.field}
              </LogColumnHeader>
            );
          }
        })}
        <LogColumnHeader
          columnWidth={columnWidths[iconColumnId]}
          data-test-subj="logColumnHeader contextMenuLogColumnHeader"
          key={'icon-column-header'}
        >
          {null}
        </LogColumnHeader>
      </>
    </LogEntryRateExampleMessageHeadersWrapper>
  );
};

const LogEntryRateExampleMessageHeadersWrapper = euiStyled(LogColumnHeadersWrapper)`
  border-bottom: none;
  box-shadow: none;
  padding-right: 0;
`;
