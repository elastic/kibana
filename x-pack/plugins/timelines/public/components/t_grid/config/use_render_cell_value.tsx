/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { set } from 'lodash/fp';
import type { GetRenderCellValue } from '@kbn/triggers-actions-ui-plugin/public';
import type { CellValueElementProps } from '../../../../common/types/timeline/cells';
import { useTGridComponentState } from '../../../methods/context';
import { Ecs } from '../../../../common/ecs';

export const useRenderCellValue: GetRenderCellValue = () => {
  const { browserFields, columnHeaders, renderCellValue, rowRenderers, timelineId } =
    useTGridComponentState();

  const CellRenderer = (_p: unknown) => {
    const props = _p as CellValueElementProps;
    const header = columnHeaders.find((h) => h.id === props.columnId);
    const _idField = props.data.find((d) => d.field === '_id');
    // TODO: _id is special in that it's not an array value. Those types are weird...
    const eventId =
      _idField && (_idField.value as unknown as string)
        ? (_idField.value as unknown as string)
        : null;

    // TODO: Where do we need ecs down in the renderer tree? Can we remove the ECS dependency there?
    const ecs = props.data.reduce((acc, { field, value }) => {
      set(field, value, acc);
      return acc;
    }, {} as Ecs);

    // TODO: re-add the following useEffect from the old renderer
    //   useEffect(() => {
    //     const defaultStyles = { overflow: 'hidden' };
    //     setCellProps({ style: { ...defaultStyles } });
    //     if (ecs && rowData) {
    //       addBuildingBlockStyle(ecs, theme, setCellProps, defaultStyles);
    //     } else {
    //       // disable the cell when it has no data
    //       setCellProps({ style: { display: 'none' } });
    //     }
    //   }, [rowIndex, setCellProps, ecs, rowData]);

    if (props.data == null || header == null || eventId == null || ecs === null) {
      return null;
    }

    const linkField = props.data.find(({ field }) => field === header.linkField);

    // TODO: globalFilters
    return renderCellValue({
      browserFields,
      colIndex: props.colIndex,
      columnId: header.id,
      data: props.data,
      ecsData: ecs,
      eventId,
      header,
      globalFilters: [],
      isDetails: props.isDetails,
      isDraggable: false,
      isExpandable: true,
      isExpanded: false,
      linkValues: linkField && linkField.value ? linkField.value : undefined,
      rowRenderers,
      rowIndex: props.rowIndex,
      setCellProps: props.setCellProps,
      timelineId: timelineId || '',
    });
  };

  return CellRenderer;
};
