/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { asyncForEach } from '@kbn/std';
import type { MapEmbeddable } from '@kbn/maps-plugin/public';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Query } from '@kbn/es-query';
import { categoryFieldTypes } from '../../../../../common/util/fields_utils';

export interface LayerResult {
  layerId: string;
  layerDisplayName: string;
  geoField: string;
  dataViewId: string;
  dataView: DataView | undefined;
  splitFieldOptions?: EuiComboBoxOptionOption[];
  query: Query | null;
}

export class VisualizationExtractor {
  constructor() {}

  public async getResultLayersFromEmbeddable(embeddable: MapEmbeddable): Promise<LayerResult[]> {
    const layers: LayerResult[] = [];
    // @ts-ignore
    const dataViews: DataView[] = embeddable.getRoot()?.getAllDataViews() ?? [];

    // Keep track of geoFields for layers as they can be repeated
    const layerGeoFields: Record<string, boolean> = {};

    await asyncForEach(embeddable.getLayerList(), async (layer) => {
      const geoField = layer.getGeoFieldNames().length ? layer.getGeoFieldNames()[0] : undefined;
      const dataViewId = layer.getIndexPatternIds().length
        ? layer.getIndexPatternIds()[0]
        : undefined;
      const layerDisplayName = await layer.getDisplayName();
      const layerId = await layer.getId();
      const query = await layer.getQuery();

      if (geoField && dataViewId && layerGeoFields[geoField] === undefined) {
        layerGeoFields[geoField] = true;
        const dataView = dataViews.find((dv: DataView) => dv.id === dataViewId);

        layers.push({
          layerId,
          layerDisplayName,
          geoField,
          dataViewId,
          dataView,
          query,
          ...(dataView
            ? { splitFieldOptions: await this.getSplitFieldOptions(dataView) }
            : { splitFieldOptions: [] }),
        });
      }
    });

    return layers;
  }

  private async getSplitFieldOptions(dataView: DataView): Promise<EuiComboBoxOptionOption[]> {
    const sortedFields =
      dataView.fields.getAll().sort((a, b) => a.name.localeCompare(b.name)) ?? [];
    const categoryFields = sortedFields.filter((f) =>
      categoryFieldTypes.some((type) => f.esTypes?.includes(type))
    );
    return categoryFields.map((field) => ({
      label: field.name,
      field: field.name,
    }));
  }
}
