/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { getOr } from 'lodash/fp';

import { Ecs, TimelineNonEcsData } from '../../../../../graphql/types';
import { ColumnHeaderOptions } from '../../../../../timelines/store/timeline/model';
import { OnColumnResized } from '../../events';
import { EventsTd, EventsTdContent, EventsTdGroupData } from '../../styles';
import { ColumnRenderer } from '../renderers/column_renderer';
import { getColumnRenderer } from '../renderers/get_column_renderer';

interface Props {
  _id: string;
  columnHeaders: ColumnHeaderOptions[];
  columnRenderers: ColumnRenderer[];
  data: TimelineNonEcsData[];
  ecsData: Ecs;
  onColumnResized: OnColumnResized;
  timelineId: string;
}

export const DataDrivenColumns = React.memo<Props>(
  ({ _id, columnHeaders, columnRenderers, data, ecsData, timelineId }) => (
    <EventsTdGroupData data-test-subj="data-driven-columns">
      {columnHeaders.map((header) => (
        <EventsTd key={header.id} width={header.width}>
          <EventsTdContent data-test-subj="cell-container">
            {getColumnRenderer(header.id, columnRenderers, data).renderColumn({
              columnName: header.id,
              eventId: _id,
              field: header,
              linkValues: getOr([], header.linkField ?? '', ecsData),
              timelineId,
              truncate: true,
              values: getMappedNonEcsValue({
                data,
                fieldName: header.id,
              }),
            })}
          </EventsTdContent>
        </EventsTd>
      ))}
    </EventsTdGroupData>
  )
);

DataDrivenColumns.displayName = 'DataDrivenColumns';

const getMappedNonEcsValue = ({
  data,
  fieldName,
}: {
  data: TimelineNonEcsData[];
  fieldName: string;
}): string[] | undefined => {
  const item = data.find((d) => d.field === fieldName);
  if (item != null && item.value != null) {
    return item.value;
  }
  return undefined;
};
