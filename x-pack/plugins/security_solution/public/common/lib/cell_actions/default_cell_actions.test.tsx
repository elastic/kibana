/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiDataGridColumn } from '@elastic/eui';
import type {
  BrowserFields,
  TimelineNonEcsData,
} from '../../../../../timelines/common/search_strategy';
import { TGridCellAction } from '../../../../../timelines/common/types';
import { Ecs } from '../../../../common/ecs';
import { ColumnHeaderType } from '../../../timelines/store/timeline/model';

import { defaultCellActions, EmptyComponent } from './default_cell_actions';
import { COLUMNS_WITH_LINKS } from './helpers';

describe('default cell actions', () => {
  const browserFields: BrowserFields = {};
  const data: TimelineNonEcsData[][] = [[]];
  const ecsData: Ecs[] = [];
  const timelineId = 'mockTimelineId';
  const pageSize = 10;

  test('columns without any link action (e.g.: signal.status) should return an empty component (not null or data grid would crash)', () => {
    const columnHeaders = [
      {
        category: 'signal',
        columnHeaderType: 'no-filtered' as ColumnHeaderType,
        id: 'signal.status',
        type: 'string',
        aggregatable: true,
        initialWidth: 105,
      },
    ];

    const columnsWithCellActions: EuiDataGridColumn[] = columnHeaders.map((header) => {
      const buildAction = (tGridCellAction: TGridCellAction) =>
        tGridCellAction({
          browserFields,
          data,
          ecsData,
          header: columnHeaders.find((h) => h.id === header.id),
          pageSize,
          timelineId,
        });

      return {
        ...header,
        cellActions: defaultCellActions?.map(buildAction),
      };
    });

    expect(columnsWithCellActions[0]?.cellActions?.length).toEqual(5);
  });

  const columnHeadersToTest = COLUMNS_WITH_LINKS.map((c) => [
    {
      category: 'signal',
      columnHeaderType: 'no-filtered' as ColumnHeaderType,
      id: c.columnId,
      type: c.fieldType,
      aggregatable: true,
      initialWidth: 105,
    },
  ]);
  describe.each(columnHeadersToTest)('columns with a link action', (columnHeaders) => {
    test(`${columnHeaders.id ?? columnHeaders.type}`, () => {
      const columnsWithCellActions: EuiDataGridColumn[] = [columnHeaders].map((header) => {
        const buildAction = (tGridCellAction: TGridCellAction) =>
          tGridCellAction({
            browserFields,
            data,
            ecsData,
            header: [columnHeaders].find((h) => h.id === header.id),
            pageSize,
            timelineId,
          });

        return {
          ...header,
          cellActions: defaultCellActions?.map(buildAction),
        };
      });

      expect(columnsWithCellActions[0]?.cellActions?.length).toEqual(5);
      expect(columnsWithCellActions[0]?.cellActions![4]).not.toEqual(EmptyComponent);
    });
  });
});
