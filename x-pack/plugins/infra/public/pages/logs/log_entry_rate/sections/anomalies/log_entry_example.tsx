/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import React, { useCallback, useMemo, useState } from 'react';
import { encode } from 'rison-node';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { ML_PAGES } from '../../../../../../../ml/common/constants/locator';
import { useMlHref } from '../../../../../../../ml/public/locator/use_ml_href';
import { localizedDate } from '../../../../../../common/formatters/datetime';
import { partitionField } from '../../../../../../common/log_analysis/job_parameters';
import { getFriendlyNameForPartitionId } from '../../../../../../common/log_analysis/log_analysis_results';
import type { LogEntryAnomaly } from '../../../../../../common/log_analysis/log_entry_anomalies';
import { isCategoryAnomaly } from '../../../../../../common/log_analysis/log_entry_anomalies';
import type { LogEntryExample } from '../../../../../../common/log_analysis/log_entry_examples';
import type { TimeRange } from '../../../../../../common/time/time_range';
import {
  LogColumnHeader,
  LogColumnHeadersWrapper,
} from '../../../../../components/logging/log_text_stream/column_headers';
import type { LogEntryColumnWidths } from '../../../../../components/logging/log_text_stream/log_entry_column';
import {
  iconColumnId,
  LogEntryColumn,
} from '../../../../../components/logging/log_text_stream/log_entry_column';
import { LogEntryContextMenu } from '../../../../../components/logging/log_text_stream/log_entry_context_menu';
import { LogEntryFieldColumn } from '../../../../../components/logging/log_text_stream/log_entry_field_column';
import { LogEntryMessageColumn } from '../../../../../components/logging/log_text_stream/log_entry_message_column';
import { LogEntryRowWrapper } from '../../../../../components/logging/log_text_stream/log_entry_row';
import { LogEntryTimestampColumn } from '../../../../../components/logging/log_text_stream/log_entry_timestamp_column';
import { useLogEntryFlyoutContext } from '../../../../../containers/logs/log_flyout';
import { useKibanaContextForPlugin } from '../../../../../hooks/use_kibana';
import { shouldHandleLinkEvent, useLinkProps } from '../../../../../hooks/use_link_props';
import type { LogColumnConfiguration } from '../../../../../utils/source_configuration';
import {
  isFieldLogColumnConfiguration,
  isMessageLogColumnConfiguration,
  isTimestampLogColumnConfiguration,
} from '../../../../../utils/source_configuration';

export const exampleMessageScale = 'medium' as const;
export const exampleTimestampFormat = 'time' as const;

const MENU_LABEL = i18n.translate('xpack.infra.logAnomalies.logEntryExamplesMenuLabel', {
  defaultMessage: 'View actions for log entry',
});

const VIEW_DETAILS_LABEL = i18n.translate(
  'xpack.infra.logs.analysis.logEntryExamplesViewDetailsLabel',
  {
    defaultMessage: 'View details',
  }
);

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

type Props = LogEntryExample & {
  timeRange: TimeRange;
  anomaly: LogEntryAnomaly;
};

export const LogEntryExampleMessage: React.FunctionComponent<Props> = ({
  id,
  dataset,
  message,
  timestamp,
  tiebreaker,
  timeRange,
  anomaly,
}) => {
  const {
    services: { ml, http, application },
  } = useKibanaContextForPlugin();
  const [isHovered, setIsHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const setItemIsHovered = useCallback(() => setIsHovered(true), []);
  const setItemIsNotHovered = useCallback(() => setIsHovered(false), []);

  const { openFlyout: openLogEntryFlyout } = useLogEntryFlyoutContext();

  // handle special cases for the dataset value
  const humanFriendlyDataset = getFriendlyNameForPartitionId(dataset);

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
      ...(dataset
        ? {
            logFilter: encode({
              expression: `${partitionField}: ${dataset}`,
              kind: 'kuery',
            }),
          }
        : {}),
    },
  });

  const viewAnomalyInMachineLearningLink = useMlHref(ml, http.basePath.get(), {
    page: ML_PAGES.SINGLE_METRIC_VIEWER,
    pageState: {
      jobIds: [anomaly.jobId],
      timeRange: {
        from: moment(timeRange.startTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        to: moment(timeRange.endTime).format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        mode: 'absolute',
      },
      entities: {
        [partitionField]: dataset,
        ...(isCategoryAnomaly(anomaly) ? { mlcategory: anomaly.categoryId } : {}),
      },
    },
  });

  const handleMlLinkClick = useCallback(
    (e) => {
      if (!viewAnomalyInMachineLearningLink || !shouldHandleLinkEvent(e)) return;
      application.navigateToUrl(viewAnomalyInMachineLearningLink);
    },
    [viewAnomalyInMachineLearningLink, application]
  );

  const menuItems = useMemo(() => {
    if (!viewInStreamLinkProps.onClick || !viewAnomalyInMachineLearningLink) {
      return undefined;
    }

    return [
      {
        label: VIEW_DETAILS_LABEL,
        onClick: () => {
          openLogEntryFlyout(id);
        },
      },
      {
        label: VIEW_IN_STREAM_LABEL,
        onClick: viewInStreamLinkProps.onClick,
        href: viewInStreamLinkProps.href,
      },
      {
        label: VIEW_ANOMALY_IN_ML_LABEL,
        onClick: handleMlLinkClick,
        href: viewAnomalyInMachineLearningLink,
      },
    ];
  }, [
    id,
    openLogEntryFlyout,
    viewInStreamLinkProps,
    viewAnomalyInMachineLearningLink,
    handleMlLinkClick,
  ]);

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

export const LogEntryExampleMessageHeaders: React.FunctionComponent<{
  dateTime: number;
}> = ({ dateTime }) => {
  return (
    <LogEntryExampleMessageHeadersWrapper>
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
    </LogEntryExampleMessageHeadersWrapper>
  );
};

const LogEntryExampleMessageHeadersWrapper = euiStyled(LogColumnHeadersWrapper)`
  border-bottom: none;
  box-shadow: none;
  padding-right: 0;
`;
