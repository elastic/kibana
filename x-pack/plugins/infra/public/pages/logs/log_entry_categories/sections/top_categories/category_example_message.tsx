/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';

import { getFriendlyNameForPartitionId } from '../../../../../../common/log_analysis';
import {
  LogEntryColumn,
  LogEntryFieldColumn,
  LogEntryMessageColumn,
  LogEntryRowWrapper,
  LogEntryTimestampColumn,
} from '../../../../../components/logging/log_text_stream';
import { LogColumnConfiguration } from '../../../../../utils/source_configuration';

export const exampleMessageScale = 'medium' as const;
export const exampleTimestampFormat = 'dateTime' as const;

export const CategoryExampleMessage: React.FunctionComponent<{
  dataset: string;
  message: string;
  timestamp: number;
}> = ({ dataset, message, timestamp }) => {
  // the dataset must be encoded for the field column and the empty value must
  // be turned into a user-friendly value
  const encodedDatasetFieldValue = useMemo(
    () => JSON.stringify(getFriendlyNameForPartitionId(dataset)),
    [dataset]
  );

  return (
    <LogEntryRowWrapper scale={exampleMessageScale}>
      <LogEntryColumn {...columnWidths[timestampColumnId]}>
        <LogEntryTimestampColumn
          format={exampleTimestampFormat}
          isHighlighted={false}
          isHovered={false}
          time={timestamp}
        />
      </LogEntryColumn>
      <LogEntryColumn {...columnWidths[messageColumnId]}>
        <LogEntryMessageColumn
          columnValue={{
            columnId: messageColumnId,
            message: [{ field: 'message', value: message, highlights: [] }],
          }}
          highlights={noHighlights}
          isHovered={false}
          isHighlighted={false}
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
          isHovered={false}
          isHighlighted={false}
          isActiveHighlight={false}
          wrapMode="none"
        />
      </LogEntryColumn>
    </LogEntryRowWrapper>
  );
};

const noHighlights: never[] = [];
const timestampColumnId = 'category-example-timestamp-column' as const;
const messageColumnId = 'category-examples-message-column' as const;
const datasetColumnId = 'category-examples-dataset-column' as const;

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
    baseWidth: '432px',
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
