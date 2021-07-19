/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { StartServicesAccessor } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { StartServicesAccessor } from 'kibana/public';
import {
  EmbeddableFactoryDefinition,
  IContainer,
} from '../../../../../../../../src/plugins/embeddable/public';
import { DATA_VISUALIZER_GRID_EMBEDDABLE_TYPE } from './constants';
import {
  DataVisualizerGridEmbeddableInput,
  DataVisualizerGridEmbeddableServices,
} from './grid_embeddable';
import { DataVisualizerPluginStart, DataVisualizerStartDependencies } from '../../../../plugin';

export class DataVisualizerGridEmbeddableFactory
  implements EmbeddableFactoryDefinition<DataVisualizerGridEmbeddableInput> {
  public readonly type = DATA_VISUALIZER_GRID_EMBEDDABLE_TYPE;

  public readonly grouping = [
    {
      id: 'data_visualizer_grid',
      getDisplayName: () => 'Data Visualizer Grid',
    },
  ];

  constructor(
    private getStartServices: StartServicesAccessor<
      DataVisualizerStartDependencies,
      DataVisualizerPluginStart
    >
  ) {}

  public async isEditable() {
    return false;
  }

  public getDisplayName() {
    return i18n.translate('xpack.dataVisualizer.index.components.grid.displayName', {
      defaultMessage: 'Data Visualizer Grid',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.dataVisualizer.index.components.grid.description', {
      defaultMessage: 'Visualize data',
    });
  }

  public async getExplicitInput(): Promise<Partial<DataVisualizerGridEmbeddableInput>> {
    // const [coreStart] = await this.getServices();
    //
    // try {
    //   const { resolveEmbeddableDataVisualizerGridUserInput } = await import(
    //     './anomaly_charts_setup_flyout'
    //   );
    //   return await resolveEmbeddableDataVisualizerGridUserInput(coreStart);
    // } catch (e) {
    //   return Promise.reject();
    // }
  }

  private async getServices(): Promise<DataVisualizerGridEmbeddableServices> {
    const [coreStart, pluginsStart] = await this.getStartServices();
    console.log('getServices', pluginsStart);

    //
    // const { AnomalyDetectorService } = await import(
    //   '../../application/services/anomaly_detector_service'
    // );
    // const { mlApiServicesProvider } = await import('../../application/services/ml_api_service');
    // const { mlResultsServiceProvider } = await import('../../application/services/results_service');
    //
    // const httpService = new HttpService(coreStart.http);
    // const anomalyDetectorService = new AnomalyDetectorService(httpService);
    // const mlApiServices = mlApiServicesProvider(httpService);
    // const mlResultsService = mlResultsServiceProvider(mlApiServices);
    //
    // const anomalyExplorerService = new AnomalyExplorerChartsService(
    //   pluginsStart.data.query.timefilter.timefilter,
    //   mlApiServices,
    //   mlResultsService
    // );
    //
    return [coreStart, pluginsStart];
  }

  public async create(initialInput: DataVisualizerGridEmbeddableInput, parent?: IContainer) {
    const [coreStart, pluginsStart] = await this.getServices();
    const { DataVisualizerGridEmbeddable } = await import('./grid_embeddable');
    return new DataVisualizerGridEmbeddable(initialInput, [coreStart, pluginsStart], parent);
  }
}
