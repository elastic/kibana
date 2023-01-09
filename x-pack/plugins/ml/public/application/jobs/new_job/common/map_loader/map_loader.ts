/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import memoizeOne from 'memoize-one';
import { isEqual } from 'lodash';
import type { DataView } from '@kbn/data-views-plugin/common';
import { ES_GEO_FIELD_TYPE, LayerDescriptor } from '@kbn/maps-plugin/common';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import { ChartLoader } from '../chart_loader';
import { Field, SplitField } from '../../../../../../common/types/fields';
const eq = (newArgs: any[], lastArgs: any[]) => isEqual(newArgs, lastArgs);

export class MapLoader extends ChartLoader {
  private _getMapData;

  constructor(indexPattern: DataView, query: object, mapsPlugin: MapsStartApi | undefined) {
    super(indexPattern, query);

    this._getMapData = mapsPlugin
      ? memoizeOne(mapsPlugin.createLayerDescriptors.createESSearchSourceLayerDescriptor, eq)
      : null;
  }

  async getMapLayersForGeoJob(
    geoField: Field,
    splitField: SplitField,
    fieldValues: string[],
    filters?: any[]
  ) {
    const layerList: LayerDescriptor[] = [];
    if (this._dataView.id !== undefined && geoField) {
      const params: any = {
        indexPatternId: this._dataView.id,
        geoFieldName: geoField.name,
        geoFieldType: geoField.type as unknown as ES_GEO_FIELD_TYPE,
        filters: filters ?? [],
        ...(fieldValues.length && splitField
          ? { query: { query: `${splitField.name}:${fieldValues[0]}`, language: 'kuery' } }
          : {}),
      };

      const searchLayerDescriptor = this._getMapData ? await this._getMapData(params) : null;

      if (searchLayerDescriptor) {
        layerList.push(searchLayerDescriptor);
      }
    }
    return layerList;
  }
}
