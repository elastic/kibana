/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datasource } from '../../../types';
import { FormBasedPrivateState } from '../types';
import { TextBasedLayer } from '../types';

export const removeColumn: Datasource<FormBasedPrivateState>['removeColumn'] = ({
  prevState,
  layerId,
  columnId,
}) => {
  return {
    ...prevState,
    layers: {
      ...prevState.layers,
      [layerId]: {
        ...(prevState.layers[layerId] as TextBasedLayer),
        columns: (prevState.layers[layerId] as TextBasedLayer).columns.filter(
          (col) => col.columnId !== columnId
        ),
      },
    },
  };
};
