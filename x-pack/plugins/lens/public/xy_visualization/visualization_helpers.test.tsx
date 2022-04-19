/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Datatable } from '@kbn/expressions-plugin/common';
import { XYDataLayerConfig, XYState } from './types';
import { convertActiveDataFromIndexesToLayers } from './visualization_helpers';

const generateDatatable = (columnName: string): Datatable => ({
  type: 'datatable',
  columns: [{ id: columnName, name: columnName, meta: { type: 'number' } }],
  rows: [],
});

describe('#convertActiveDataFromIndexesToLayers', () => {
  const partialLayer: Omit<XYDataLayerConfig, 'layerId'> = {
    layerType: 'data',
    accessors: [],
    seriesType: 'area',
  };

  const datatable1: Datatable = generateDatatable('first');
  const datatable2: Datatable = generateDatatable('second');
  const datatable3: Datatable = generateDatatable('third');
  const datatable4: Datatable = generateDatatable('fourth');
  const datatable5: Datatable = generateDatatable('fifth');

  const activeData = {
    0: datatable1,
    1: datatable2,
    2: datatable3,
    3: datatable4,
  };

  const layers: XYState['layers'] = [
    { layerId: 'id1', ...partialLayer },
    { layerId: 'id2', ...partialLayer },
    { layerId: 'id3', ...partialLayer },
    { layerId: 'id4', ...partialLayer },
  ];

  it('should convert activeData indexes to layerIds', () => {
    const result = convertActiveDataFromIndexesToLayers(activeData, layers);
    expect(result).toStrictEqual({
      id1: datatable1,
      id2: datatable2,
      id3: datatable3,
      id4: datatable4,
    });
  });

  it('should not remap layerIds from activeData', () => {
    const result = convertActiveDataFromIndexesToLayers({ ...activeData, id0: datatable5 }, layers);
    expect(result).toStrictEqual({
      id1: datatable1,
      id2: datatable2,
      id3: datatable3,
      id4: datatable4,
      id0: datatable5,
    });
  });

  it('should return undefined if activeData is empty', () => {
    const result = convertActiveDataFromIndexesToLayers({}, layers);
    expect(result).toBeUndefined();
  });

  it('should skip if no activeData is passed', () => {
    const result = convertActiveDataFromIndexesToLayers(undefined, []);
    expect(result).toBeUndefined();
  });
});
