/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { createDatasetQualityESClient } from '../../../utils';
import { updateComponentTemplate } from './update_component_template';
import { updateLastBackingIndexSettings } from './update_settings_last_backing_index';
import { UpdateFieldLimitResponse } from '../../../../common/api_types';
import { getDataStreamSettings } from '../get_data_stream_details';

export async function updateFieldLimit({
  esClient,
  newFieldLimit,
  dataStream,
}: {
  esClient: ElasticsearchClient;
  newFieldLimit: number;
  dataStream: string;
}): Promise<UpdateFieldLimitResponse> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const { lastBackingIndex, indexTemplate } = await getDataStreamSettings({ esClient, dataStream });

  const {
    acknowledged: isComponentTemplateUpdated,
    componentTemplateName,
    error: errorUpdatingComponentTemplate,
  } = await updateComponentTemplate({ datasetQualityESClient, indexTemplate, newFieldLimit });

  if (!isComponentTemplateUpdated) {
    return {
      isComponentTemplateUpdated,
      isLatestBackingIndexUpdated: false,
      customComponentTemplateName: componentTemplateName,
      error: errorUpdatingComponentTemplate,
    };
  }

  const { acknowledged: isLatestBackingIndexUpdated, error: errorUpdatingBackingIndex } =
    await updateLastBackingIndexSettings({
      datasetQualityESClient,
      lastBackingIndex,
      newFieldLimit,
    });

  return {
    isComponentTemplateUpdated,
    isLatestBackingIndexUpdated,
    customComponentTemplateName: componentTemplateName,
    error: errorUpdatingBackingIndex,
  };
}
