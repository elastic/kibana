/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import uuid from 'uuid';
import type { StartServicesAccessor } from 'kibana/public';
import type { LayerWizard, RenderWizardArguments } from '../../../maps/public';
import { COLOR_MAP_TYPE, FIELD_ORIGIN, LAYER_TYPE, STYLE_TYPE } from '../../../maps/common';
import { CreateAnomalySourceEditor } from './create_anomaly_source_editor';
import {
  VectorLayerDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../maps/common/descriptor_types';
import { AnomalySource, AnomalySourceDescriptor } from './anomaly_source';

import { HttpService } from '../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../plugin';
import type { MlDependencies } from '../application/app';

export const ML_ANOMALY = 'ML_ANOMALIES';

export class AnomalyLayerWizardFactory {
  public readonly type = ML_ANOMALY;

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>,
    private canGetJobs: any
  ) {
    this.canGetJobs = canGetJobs;
  }

  private async getServices(): Promise<any> {
    const [coreStart, pluginsStart] = await this.getStartServices();
    const { jobsApiProvider } = await import('../application/services/ml_api_service/jobs');

    const httpService = new HttpService(coreStart.http);
    const mlJobsService = jobsApiProvider(httpService);

    return [coreStart, pluginsStart as MlDependencies, { mlJobsService }];
  }

  public async create(): Promise<LayerWizard> {
    const services = await this.getServices();
    const mlJobsService = services[2].mlJobsService;
    const { anomalyLayerWizard } = await import('./anomaly_layer_wizard');

    anomalyLayerWizard.getIsDisabled = () => !this.canGetJobs;

    anomalyLayerWizard.renderWizard = ({ previewLayers }: RenderWizardArguments) => {
      const onSourceConfigChange = (sourceConfig: Partial<AnomalySourceDescriptor> | null) => {
        if (!sourceConfig) {
          previewLayers([]);
          return;
        }

        const anomalyLayerDescriptor: VectorLayerDescriptor = {
          id: uuid(),
          type: LAYER_TYPE.GEOJSON_VECTOR,
          sourceDescriptor: AnomalySource.createDescriptor({
            jobId: sourceConfig.jobId,
            typicalActual: sourceConfig.typicalActual,
          }),
          style: {
            type: 'VECTOR',
            properties: {
              fillColor: {
                type: STYLE_TYPE.DYNAMIC,
                options: {
                  color: 'Blue to Red',
                  colorCategory: 'palette_0',
                  fieldMetaOptions: { isEnabled: true, sigma: 3 },
                  type: COLOR_MAP_TYPE.ORDINAL,
                  field: {
                    name: 'record_score',
                    origin: FIELD_ORIGIN.SOURCE,
                  },
                  useCustomColorRamp: false,
                },
              },
            } as unknown as VectorStylePropertiesDescriptor,
            isTimeAware: false,
          },
        };

        previewLayers([anomalyLayerDescriptor]);
      };

      return (
        <CreateAnomalySourceEditor
          onSourceConfigChange={onSourceConfigChange}
          mlJobsService={mlJobsService}
        />
      );
    };

    return anomalyLayerWizard as LayerWizard;
  }
}
