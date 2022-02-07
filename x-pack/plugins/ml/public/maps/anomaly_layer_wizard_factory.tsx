/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { htmlIdGenerator } from '@elastic/eui';
import type { StartServicesAccessor } from 'kibana/public';
import type { LayerWizard, RenderWizardArguments } from '../../../maps/public';
import { FIELD_ORIGIN, LAYER_TYPE, STYLE_TYPE } from '../../../maps/common';
import { SEVERITY_COLOR_RAMP } from '../../common';
import { CreateAnomalySourceEditor } from './create_anomaly_source_editor';
import {
  VectorLayerDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../maps/common/descriptor_types';
import { AnomalySource, AnomalySourceDescriptor } from './anomaly_source';

import { HttpService } from '../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../plugin';
import type { MlApiServices } from '../application/services/ml_api_service';

export const ML_ANOMALY = 'ML_ANOMALIES';
const CUSTOM_COLOR_RAMP = {
  type: STYLE_TYPE.DYNAMIC,
  options: {
    customColorRamp: SEVERITY_COLOR_RAMP,
    field: {
      name: 'record_score',
      origin: FIELD_ORIGIN.SOURCE,
    },
    useCustomColorRamp: true,
  },
};

export class AnomalyLayerWizardFactory {
  public readonly type = ML_ANOMALY;

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>,
    private canGetJobs: boolean
  ) {
    this.canGetJobs = canGetJobs;
  }

  private async getServices(): Promise<{ mlJobsService: MlApiServices['jobs'] }> {
    const [coreStart] = await this.getStartServices();
    const { jobsApiProvider } = await import('../application/services/ml_api_service/jobs');

    const httpService = new HttpService(coreStart.http);
    const mlJobsService = jobsApiProvider(httpService);

    return { mlJobsService };
  }

  public async create(): Promise<LayerWizard> {
    const { mlJobsService } = await this.getServices();
    const { anomalyLayerWizard } = await import('./anomaly_layer_wizard');

    anomalyLayerWizard.getIsDisabled = () => !this.canGetJobs;

    anomalyLayerWizard.renderWizard = ({ previewLayers }: RenderWizardArguments) => {
      const onSourceConfigChange = (sourceConfig: Partial<AnomalySourceDescriptor> | null) => {
        if (!sourceConfig) {
          previewLayers([]);
          return;
        }

        const anomalyLayerDescriptor: VectorLayerDescriptor = {
          id: htmlIdGenerator()(),
          type: LAYER_TYPE.GEOJSON_VECTOR,
          sourceDescriptor: AnomalySource.createDescriptor({
            jobId: sourceConfig.jobId,
            typicalActual: sourceConfig.typicalActual,
          }),
          style: {
            type: 'VECTOR',
            properties: {
              fillColor: CUSTOM_COLOR_RAMP,
              lineColor: CUSTOM_COLOR_RAMP,
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
