/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import type { DatasourceMap, FramePublicAPI } from '../../../types';
import { useLensSelector, selectFramePublicAPI } from '../../../state_management';

export function useFramePublicApi({
  attributes,
  datasourceId,
  datasourceMap,
  dataTable,
}: {
  attributes: TypedLensByValueInput['attributes'];
  datasourceId: 'formBased' | 'textBased';
  datasourceMap: DatasourceMap;
  dataTable?: Datatable;
}): FramePublicAPI {
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeDatasource = datasourceMap[datasourceId];
  const activeData: Record<string, Datatable> = {};
  const layers = activeDatasource.getLayers(datasourceState);
  layers.forEach((layer) => {
    if (dataTable) {
      activeData[layer] = dataTable;
    }
  });

  const framePublicAPI = useLensSelector((state) => {
    const newState = {
      ...state,
      lens: {
        ...state.lens,
        activeData,
      },
    };
    return selectFramePublicAPI(newState, datasourceMap);
  });

  return framePublicAPI;
}
