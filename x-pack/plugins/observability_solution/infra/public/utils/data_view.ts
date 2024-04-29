/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView, DataViewsContract, type FieldSpec } from '@kbn/data-views-plugin/common';
import { TIMESTAMP_FIELD } from '../../common/constants';

export interface ResolvedDataView {
  dataViewReference: DataView;
  indices: string;
  fields: FieldSpec[];
  timeFieldName: string;
}

interface PersistedDataView {
  dataViewsService: DataViewsContract;
  dataViewId: string;
}

interface DataViewAttributes {
  timeFieldName: string;
  indexPattern: string;
  name?: string;
}

export async function resolveDataView({
  dataViewId,
  dataViewsService,
}: {
  dataViewId: string;
  dataViewsService: DataViewsContract;
}) {
  try {
    return resolvePersistedDataView({ dataViewsService, dataViewId });
  } catch {
    return resolveAdHocDataView({
      dataViewsService,
      dataViewId,
      attributes: {
        indexPattern: dataViewId,
        timeFieldName: TIMESTAMP_FIELD,
      },
    });
  }
}

export const resolvePersistedDataView = async ({
  dataViewsService,
  dataViewId,
}: PersistedDataView): Promise<ResolvedDataView> => {
  const dataView = await dataViewsService.get(dataViewId, false);

  return {
    indices: dataView.getIndexPattern(),
    timeFieldName: dataView.timeFieldName ?? TIMESTAMP_FIELD,
    fields: dataView.fields ?? [],
    dataViewReference: dataView,
  };
};

export const resolveAdHocDataView = async ({
  dataViewsService,
  dataViewId,
  attributes,
}: PersistedDataView & { attributes: DataViewAttributes }): Promise<ResolvedDataView> => {
  const { indexPattern, name, timeFieldName } = attributes;
  const dataViewReference = await dataViewsService.create(
    {
      id: dataViewId,
      name,
      title: indexPattern,
      timeFieldName,
    },
    false,
    false
  );

  return {
    indices: indexPattern,
    timeFieldName,
    fields: dataViewReference.fields,
    dataViewReference,
  };
};
