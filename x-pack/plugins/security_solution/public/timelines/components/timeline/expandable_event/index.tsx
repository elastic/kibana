/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../../common/containers/source';
import { ColumnHeaderOptions } from '../../../../timelines/store/timeline/model';
import { DetailItem } from '../../../../graphql/types';
import { StatefulEventDetails } from '../../../../common/components/event_details/stateful_event_details';
import { LazyAccordion } from '../../lazy_accordion';
import { OnUpdateColumns } from '../events';

const ExpandableDetails = styled.div<{ hideExpandButton: boolean }>`
  ${({ hideExpandButton }) =>
    hideExpandButton
      ? `
  .euiAccordion__button {
    display: none;
  }
  `
      : ''};
`;

ExpandableDetails.displayName = 'ExpandableDetails';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  id: string;
  event: DetailItem[];
  forceExpand?: boolean;
  hideExpandButton?: boolean;
  onUpdateColumns: OnUpdateColumns;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

export const ExpandableEvent = React.memo<Props>(
  ({
    browserFields,
    columnHeaders,
    event,
    forceExpand = false,
    id,
    timelineId,
    toggleColumn,
    onUpdateColumns,
  }) => (
    <ExpandableDetails hideExpandButton={true}>
      <LazyAccordion
        id={`timeline-${timelineId}-row-${id}`}
        renderExpandedContent={() => (
          <StatefulEventDetails
            browserFields={browserFields}
            columnHeaders={columnHeaders}
            data={event}
            id={id}
            onUpdateColumns={onUpdateColumns}
            timelineId={timelineId}
            toggleColumn={toggleColumn}
          />
        )}
        forceExpand={forceExpand}
        paddingSize="none"
      />
    </ExpandableDetails>
  )
);

ExpandableEvent.displayName = 'ExpandableEvent';
