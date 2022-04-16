/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { StartServicesAccessor } from '@kbn/core/public';

import type { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { PLUGIN_ID, PLUGIN_ICON, ML_APP_NAME } from '../../../common/constants/app';
import { HttpService } from '../../application/services/http_service';
import type { MlPluginStart, MlStartDependencies } from '../../plugin';
import type { MlDependencies } from '../../application/app';
import {
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableServices,
} from '..';

export class AnomalySwimlaneEmbeddableFactory
  implements EmbeddableFactoryDefinition<AnomalySwimlaneEmbeddableInput>
{
  public readonly type = ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;

  public readonly grouping = [
    {
      id: PLUGIN_ID,
      getDisplayName: () => ML_APP_NAME,
      getIconType: () => PLUGIN_ICON,
    },
  ];

  constructor(
    private getStartServices: StartServicesAccessor<MlStartDependencies, MlPluginStart>
  ) {}

  public async isEditable() {
    return true;
  }

  public getDisplayName() {
    return i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.displayName', {
      defaultMessage: 'Anomaly swim lane',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.description', {
      defaultMessage: 'View anomaly detection results in a timeline.',
    });
  }

  public async getExplicitInput(): Promise<Partial<AnomalySwimlaneEmbeddableInput>> {
    const [coreStart] = await this.getServices();

    try {
      const { resolveAnomalySwimlaneUserInput } = await import('./anomaly_swimlane_setup_flyout');
      return await resolveAnomalySwimlaneUserInput(coreStart);
    } catch (e) {
      return Promise.reject();
    }
  }

  private async getServices(): Promise<AnomalySwimlaneEmbeddableServices> {
    const [coreStart, pluginsStart] = await this.getStartServices();

    const { AnomalyDetectorService } = await import(
      '../../application/services/anomaly_detector_service'
    );
    const { AnomalyTimelineService } = await import(
      '../../application/services/anomaly_timeline_service'
    );
    const { mlApiServicesProvider } = await import('../../application/services/ml_api_service');
    const { mlResultsServiceProvider } = await import('../../application/services/results_service');

    const httpService = new HttpService(coreStart.http);
    const anomalyDetectorService = new AnomalyDetectorService(httpService);
    const anomalyTimelineService = new AnomalyTimelineService(
      pluginsStart.data.query.timefilter.timefilter,
      coreStart.uiSettings,
      mlResultsServiceProvider(mlApiServicesProvider(httpService))
    );

    return [
      coreStart,
      pluginsStart as MlDependencies,
      { anomalyDetectorService, anomalyTimelineService },
    ];
  }

  public async create(
    initialInput: AnomalySwimlaneEmbeddableInput,
    parent?: IContainer
  ): Promise<any> {
    const services = await this.getServices();
    const { AnomalySwimlaneEmbeddable } = await import('./anomaly_swimlane_embeddable');
    return new AnomalySwimlaneEmbeddable(initialInput, services, parent);
  }
}
