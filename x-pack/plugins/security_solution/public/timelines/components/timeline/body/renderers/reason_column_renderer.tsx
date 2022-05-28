/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiPanel } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useMemo } from 'react';

import { ColumnHeaderOptions, RowRenderer } from '../../../../../../common/types';
import { Ecs } from '../../../../../../common/ecs';
import { eventRendererNames } from '../../../row_renderers_browser/catalog/constants';
import { ColumnRenderer } from './column_renderer';
import { REASON_FIELD_NAME } from './constants';
import { getRowRenderer } from './get_row_renderer';
import { plainColumnRenderer } from './plain_column_renderer';
import * as i18n from './translations';

export const reasonColumnRenderer: ColumnRenderer = {
  isInstance: isEqual(REASON_FIELD_NAME),

  renderColumn: ({
    columnName,
    ecsData,
    eventId,
    field,
    isDetails,
    isDraggable = true,
    linkValues,
    rowRenderers = [],
    timelineId,
    truncate,
    values,
  }: {
    columnName: string;
    ecsData?: Ecs;
    eventId: string;
    field: ColumnHeaderOptions;
    isDetails?: boolean;
    isDraggable?: boolean;
    linkValues?: string[] | null | undefined;
    rowRenderers?: RowRenderer[];
    timelineId: string;
    truncate?: boolean;
    values: string[] | undefined | null;
  }) => {
    if (isDetails && values && ecsData && rowRenderers) {
      return values.map((value, i) => (
        <ReasonCell
          ecsData={ecsData}
          key={`reason-column-renderer-value-${timelineId}-${columnName}-${eventId}-${field.id}-${value}-${i}`}
          rowRenderers={rowRenderers}
          timelineId={timelineId}
          value={value}
        />
      ));
    } else {
      return plainColumnRenderer.renderColumn({
        columnName,
        eventId,
        field,
        isDetails,
        isDraggable,
        linkValues,
        timelineId,
        truncate,
        values,
      });
    }
  },
};

const ReasonCell: React.FC<{
  value: string | number | undefined | null;
  timelineId: string;
  ecsData: Ecs;
  rowRenderers: RowRenderer[];
}> = ({ ecsData, rowRenderers, timelineId, value }) => {
  const rowRenderer = useMemo(() => getRowRenderer(ecsData, rowRenderers), [ecsData, rowRenderers]);

  const rowRender = useMemo(() => {
    return (
      rowRenderer &&
      rowRenderer.renderRow({
        data: ecsData,
        isDraggable: false,
        timelineId,
      })
    );
  }, [rowRenderer, ecsData, timelineId]);

  return (
    <>
      {rowRenderer && rowRender ? (
        <>
          {value}
          <h4>{i18n.REASON_RENDERER_TITLE(eventRendererNames[rowRenderer.id] ?? '')}</h4>
          <EuiSpacer size="xs" />
          <EuiPanel color="subdued" className="eui-xScroll" data-test-subj="reason-cell-renderer">
            <div className="eui-displayInlineBlock">{rowRender}</div>
          </EuiPanel>
        </>
      ) : (
        value
      )}
    </>
  );
};
