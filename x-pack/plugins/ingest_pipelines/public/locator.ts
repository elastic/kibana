/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializableState } from 'src/plugins/kibana_utils/common';
import { ManagementAppLocator } from 'src/plugins/management/common/locator';
import {
  LocatorPublic,
  LocatorDefinition,
  KibanaLocation,
} from '../../../../src/plugins/share/public';
import {
  getClonePath,
  getCreatePath,
  getEditPath,
  getListPath,
} from './application/services/navigation';
import { PLUGIN_ID } from '../common/constants';

export enum INGEST_PIPELINES_PAGES {
  LIST = 'pipelines_list',
  EDIT = 'pipeline_edit',
  CREATE = 'pipeline_create',
  CLONE = 'pipeline_clone',
}

interface IngestPipelinesParams extends SerializableState {
  page: INGEST_PIPELINES_PAGES;
  pipelineId: string;
  absolute?: boolean;
}

export type IngestPipelinesLocator = LocatorPublic<void>;

export const INGEST_PIPELINES_APP_LOCATOR = 'INGEST_PIPELINES_APP_LOCATOR';

export interface IngestPipelinesLocatorDependencies {
  managementAppLocator: ManagementAppLocator;
}

export class IngestPipelinesLocatorDefinition implements LocatorDefinition<IngestPipelinesParams> {
  public readonly id = INGEST_PIPELINES_APP_LOCATOR;

  constructor(protected readonly deps: IngestPipelinesLocatorDependencies) {}

  public readonly getLocation = async (params: IngestPipelinesParams): Promise<KibanaLocation> => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'ingest',
      appId: PLUGIN_ID,
    });

    switch (params.page) {
      case INGEST_PIPELINES_PAGES.EDIT: {
        return {
          ...location,
          path:
            location.path +
            getEditPath({
              pipelineName: params.pipelineId,
            }),
        };
      }
      case INGEST_PIPELINES_PAGES.CREATE: {
        return {
          ...location,
          path: location.path + getCreatePath(),
        };
      }
      case INGEST_PIPELINES_PAGES.LIST: {
        return {
          ...location,
          path:
            location.path +
            getListPath({
              inspectedPipelineName: params.pipelineId,
            }),
        };
      }
      case INGEST_PIPELINES_PAGES.CLONE: {
        return {
          ...location,
          path:
            location.path +
            getClonePath({
              clonedPipelineName: params.pipelineId,
            }),
        };
      }
    }
  };
}
