/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CellValueElementProps } from '../../../timelines/components/timeline/cell_rendering';
import { DefaultCellRenderer } from '../../../timelines/components/timeline/cell_rendering/default_cell_renderer';
import { getEmptyValue } from '../empty_value';
import { MAPPED_PROCESS_END_COLUMN } from './default_headers';

const hasEcsDataEndEventAction = (ecsData: CellValueElementProps['ecsData']) => {
  return ecsData?.event?.action?.includes('end');
};

export const CellRenderer: React.FC<CellValueElementProps> = (props: CellValueElementProps) => {
  // We only want to render process.end for event.actions of type 'end'
  if (props.columnId === MAPPED_PROCESS_END_COLUMN && !hasEcsDataEndEventAction(props.ecsData)) {
    return <>{getEmptyValue()}</>;
  }

  return <DefaultCellRenderer {...props} />;
};
