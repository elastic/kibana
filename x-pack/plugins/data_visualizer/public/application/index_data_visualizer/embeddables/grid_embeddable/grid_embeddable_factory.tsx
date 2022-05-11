/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StartServicesAccessor } from '@kbn/core/public';
import { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { DATA_VISUALIZER_GRID_EMBEDDABLE_TYPE } from './constants';
import {
  DataVisualizerGridEmbeddableInput,
  DataVisualizerGridEmbeddableServices,
} from './grid_embeddable';
import { DataVisualizerPluginStart, DataVisualizerStartDependencies } from '../../../../plugin';

export class DataVisualizerGridEmbeddableFactory
  implements EmbeddableFactoryDefinition<DataVisualizerGridEmbeddableInput>
{
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

  public canCreateNew() {
    return false;
  }

  public getDisplayName() {
    return i18n.translate('xpack.dataVisualizer.index.components.grid.displayName', {
      defaultMessage: 'Data visualizer grid',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.dataVisualizer.index.components.grid.description', {
      defaultMessage: 'Visualize data',
    });
  }

  private async getServices(): Promise<DataVisualizerGridEmbeddableServices> {
    const [coreStart, pluginsStart] = await this.getStartServices();
    return [coreStart, pluginsStart];
  }

  public async create(initialInput: DataVisualizerGridEmbeddableInput, parent?: IContainer) {
    const [coreStart, pluginsStart] = await this.getServices();
    const { DataVisualizerGridEmbeddable } = await import('./grid_embeddable');
    return new DataVisualizerGridEmbeddable(initialInput, [coreStart, pluginsStart], parent);
  }
}
