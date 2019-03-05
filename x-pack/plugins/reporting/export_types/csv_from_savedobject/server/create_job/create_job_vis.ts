/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectMeta,
  SavedObjectReference,
  TimeRangeParams,
  VisObjectAttributes,
  VisObjectAttributesJSON,
  VisPanel,
} from '../../types';

interface VisData {
  title: string;
  visType: string;
  panel: VisPanel;
}

interface VisAgg {
  enabled: boolean;
  id: string;
  params: {
    extended_bounds?: any;
    interval?: number;
    customLable?: string;
    field?: string;
  };
  schema: string;
  type: string;
}

interface VisMetric {
  accessor: number;
  aggType: string;
  format: {
    id: string;
  };
  params: any;
}

interface VisParams {
  dimensions: {
    buckets: any[];
    metrics: VisMetric[];
  };
  perPage: number;
  showMetricsAtAllLevels: boolean;
  showPartialRows: boolean;
  showTotal: boolean;
  totalFunc: string;
}

/*
 * The caller of this function calls other modules that return promise
 * This function is declared async for consistency
 */
export async function createJobVis(
  timerange: TimeRangeParams,
  attributes: VisObjectAttributesJSON,
  refs: SavedObjectReference[],
  kibanaSavedObjectMeta: SavedObjectMeta
): Promise<VisData> {
  const { title, visState: visStateJSON, uiStateJSON } = attributes;
  if (!visStateJSON) {
    throw new Error('Could not parse saved object data!');
  }

  let visState: VisObjectAttributes;
  let aggs: VisAgg[];
  let params: VisParams;
  try {
    visState = JSON.parse(visStateJSON);
    aggs = visState.aggs;
    params = visState.params;
  } catch (err) {
    throw new Error(`Could not get saved object vis state! ${err}`);
  }

  let uiState;
  try {
    uiState = JSON.parse(uiStateJSON);
  } catch (err) {
    throw new Error(`Could not get saved object ui state! ${err}`);
  }

  const savedSearchMeta = refs.find(({ type }) => type === 'search') as { id?: string };
  const indexPatternMeta = refs.find(({ type }) => type === 'index-pattern') as { id?: string };
  if (!indexPatternMeta && !savedSearchMeta) {
    throw new Error('Could not find an index pattern or saved search for the visualization!');
  }

  const savedVisState: VisObjectAttributes = {
    ...attributes,
    type: visState.type,
    aggs,
    params,
    sort: [],
    uiState,
    kibanaSavedObjectMeta,
  };
  const vPanel: VisPanel = {
    indexPatternSavedObjectId: indexPatternMeta ? indexPatternMeta.id : indexPatternMeta,
    savedSearchObjectId: savedSearchMeta ? savedSearchMeta.id : savedSearchMeta,
    attributes: savedVisState,
    timerange,
  };

  return {
    panel: vPanel,
    title,
    visType: visState.type,
  };
}
