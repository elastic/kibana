/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingRuntimeFields } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';

export interface RiskInputsIndexResponse {
  index: string;
  runtimeMappings: MappingRuntimeFields;
}

export const getRiskInputsIndex = async ({
  dataViewId,
  logger,
  soClient,
}: {
  dataViewId: string;
  logger: Logger;
  soClient: SavedObjectsClientContract;
}): Promise<RiskInputsIndexResponse> => {
  try {
    const dataView = await soClient.get<DataViewAttributes>('index-pattern', dataViewId);
    const index = dataView.attributes.title;
    const runtimeMappings =
      dataView.attributes.runtimeFieldMap != null
        ? JSON.parse(dataView.attributes.runtimeFieldMap)
        : {};

    return {
      index,
      runtimeMappings,
    };
  } catch (e) {
    logger.info(
      `No dataview found for ID '${dataViewId}'; using ID instead as simple index pattern`
    );
    return { index: dataViewId, runtimeMappings: {} };
  }
};
