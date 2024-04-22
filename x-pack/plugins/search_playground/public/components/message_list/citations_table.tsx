/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiButtonEmpty, EuiText } from '@elastic/eui';
import { AIMessage as AIMessageType, Doc } from '../../types';

type CitationsTableProps = Pick<AIMessageType, 'citations'>;

export const CitationsTable: React.FC<CitationsTableProps> = ({ citations }) => {
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, React.ReactNode>
  >({});
  const toggleDetails = (citation: Doc) => {
    const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

    if (itemIdToExpandedRowMapValues[citation.metadata._id]) {
      delete itemIdToExpandedRowMapValues[citation.metadata._id];
    } else {
      itemIdToExpandedRowMapValues[citation.metadata._id] = (
        <EuiText size="s">{citation.content}</EuiText>
      );
    }

    setItemIdToExpandedRowMap(itemIdToExpandedRowMapValues);
  };

  return (
    <EuiBasicTable
      columns={[
        {
          field: 'metadata._id',
          name: i18n.translate('xpack.searchPlayground.chat.message.assistant.citations.idField', {
            defaultMessage: 'Index ID',
          }),
          truncateText: true,
        },
        {
          truncateText: false,
          align: 'right',
          isExpander: true,
          render: (citation: Doc) => {
            const itemIdToExpandedRowMapValues = { ...itemIdToExpandedRowMap };

            return (
              <EuiButtonEmpty
                iconSide="right"
                size="s"
                onClick={() => toggleDetails(citation)}
                iconType={
                  itemIdToExpandedRowMapValues[citation.metadata._id] ? 'arrowDown' : 'arrowRight'
                }
              >
                {i18n.translate('xpack.searchPlayground.chat.message.assistant.citations.snippet', {
                  defaultMessage: 'Snippet',
                })}
              </EuiButtonEmpty>
            );
          },
        },
      ]}
      items={citations}
      itemId="id"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable
    />
  );
};
