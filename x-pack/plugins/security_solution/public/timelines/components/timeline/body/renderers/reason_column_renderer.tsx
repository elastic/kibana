/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiPanel } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React, { useMemo } from 'react';

import { BrowserFields, ColumnHeaderOptions, RowRenderer } from '../../../../../../common';
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
    eventId,
    field,
    isDraggable = true,
    timelineId,
    truncate,
    values,
    linkValues,
    ecsData,
    rowRenderers = [],
    browserFields,
    isDetails,
  }: {
    columnName: string;
    eventId: string;
    field: ColumnHeaderOptions;
    isDraggable?: boolean;
    timelineId: string;
    truncate?: boolean;
    values: string[] | undefined | null;
    linkValues?: string[] | null | undefined;

    ecsData?: Ecs;
    rowRenderers?: RowRenderer[];
    browserFields?: BrowserFields;
    isDetails: boolean;
  }) => {
    if (isDetails && values && ecsData && rowRenderers && browserFields) {
      return values.map((value, i) => (
        <ReasonCell
          key={`reason-column-renderer-value-${timelineId}-${columnName}-${eventId}-${field.id}-${value}-${i}`}
          timelineId={timelineId}
          value={value}
          ecsData={ecsData}
          rowRenderers={rowRenderers}
          browserFields={browserFields}
        />
      ));
    } else {
      return plainColumnRenderer.renderColumn({
        columnName,
        eventId,
        field,
        isDraggable,
        timelineId,
        truncate,
        values,
        linkValues,
        isDetails,
      });
    }
  },
};

const ReasonCell: React.FC<{
  value: string | number | undefined | null;
  timelineId: string;
  ecsData: Ecs;
  rowRenderers: RowRenderer[];
  browserFields: BrowserFields;
}> = ({ ecsData, rowRenderers, browserFields, timelineId, value }) => {
  const rowRenderer = useMemo(() => getRowRenderer(ecsData, rowRenderers), [ecsData, rowRenderers]);

  const rowRender = useMemo(() => {
    return (
      rowRenderer &&
      rowRenderer.renderRow({
        browserFields,
        data: ecsData,
        isDraggable: false,
        timelineId,
      })
    );
  }, [rowRenderer, browserFields, ecsData, timelineId]);

  return (
    <>
      {rowRenderer && rowRender ? (
        <>
          {value}
          <h4>{i18n.EVENT_RENDERER_POPOVER_TITLE(eventRendererNames[rowRenderer.id] ?? '')}</h4>
          <EuiSpacer size="xs" />
          <EuiPanel color="subdued" data-test-subj="tGridEmptyState">
            {rowRender}
          </EuiPanel>
        </>
      ) : (
        value
      )}
    </>
  );
};
