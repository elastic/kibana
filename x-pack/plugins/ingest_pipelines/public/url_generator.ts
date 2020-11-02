/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { MANAGEMENT_APP_ID } from '../../../../src/plugins/management/public';
import { UrlGeneratorsDefinition } from '../../../../src/plugins/share/public';
import {
  getClonePath,
  getCreatePath,
  getEditPath,
  getListPath,
} from './application/services/navigation';
import { SetupDependencies } from './types';
import { PLUGIN_ID } from '../common/constants';

export const INGEST_PIPELINES_APP_ULR_GENERATOR = 'INGEST_PIPELINES_APP_URL_GENERATOR';

export enum INGEST_PIPELINES_PAGES {
  LIST = 'pipelines_list',
  EDIT = 'pipeline_edit',
  CREATE = 'pipeline_create',
  CLONE = 'pipeline_clone',
}

interface UrlGeneratorState {
  pipelineId: string;
  absolute?: boolean;
}
export interface PipelinesListUrlGeneratorState extends Partial<UrlGeneratorState> {
  page: INGEST_PIPELINES_PAGES.LIST;
}

export interface PipelineEditUrlGeneratorState extends UrlGeneratorState {
  page: INGEST_PIPELINES_PAGES.EDIT;
}

export interface PipelineCloneUrlGeneratorState extends UrlGeneratorState {
  page: INGEST_PIPELINES_PAGES.CLONE;
}

export interface PipelineCreateUrlGeneratorState extends UrlGeneratorState {
  page: INGEST_PIPELINES_PAGES.CREATE;
}

export type IngestPipelinesUrlGeneratorState =
  | PipelinesListUrlGeneratorState
  | PipelineEditUrlGeneratorState
  | PipelineCloneUrlGeneratorState
  | PipelineCreateUrlGeneratorState;

export class IngestPipelinesUrlGenerator
  implements UrlGeneratorsDefinition<typeof INGEST_PIPELINES_APP_ULR_GENERATOR> {
  constructor(private readonly getAppBasePath: (absolute: boolean) => Promise<string>) {}

  public readonly id = INGEST_PIPELINES_APP_ULR_GENERATOR;

  public readonly createUrl = async (state: IngestPipelinesUrlGeneratorState): Promise<string> => {
    switch (state.page) {
      case INGEST_PIPELINES_PAGES.EDIT: {
        return `${await this.getAppBasePath(!!state.absolute)}${getEditPath({
          pipelineName: state.pipelineId,
        })}`;
      }
      case INGEST_PIPELINES_PAGES.CREATE: {
        return `${await this.getAppBasePath(!!state.absolute)}${getCreatePath()}`;
      }
      case INGEST_PIPELINES_PAGES.LIST: {
        return `${await this.getAppBasePath(!!state.absolute)}${getListPath({
          inspectedPipelineName: state.pipelineId,
        })}`;
      }
      case INGEST_PIPELINES_PAGES.CLONE: {
        return `${await this.getAppBasePath(!!state.absolute)}${getClonePath({
          clonedPipelineName: state.pipelineId,
        })}`;
      }
    }
  };
}

export const registerUrlGenerator = (
  coreSetup: CoreSetup,
  management: SetupDependencies['management'],
  share: SetupDependencies['share']
) => {
  const getAppBasePath = async (absolute = false) => {
    const [coreStart] = await coreSetup.getStartServices();
    return coreStart.application.getUrlForApp(MANAGEMENT_APP_ID, {
      path: management.sections.section.ingest.getApp(PLUGIN_ID)!.basePath,
      absolute: !!absolute,
    });
  };

  share.urlGenerators.registerUrlGenerator(new IngestPipelinesUrlGenerator(getAppBasePath));
};
