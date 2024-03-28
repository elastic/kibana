/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
// import { DATA_VISUALIZER_GRID_EMBEDDABLE_TYPE } from './constants';
// import type { DataVisualizerGridEmbeddableServices } from './grid_embeddable';
// import type { DataVisualizerGridEmbeddableInput } from './types';
// import type { EmbeddableLogCategorizationType } from '../../../common/constants';

import { EMBEDDABLE_LOG_CATEGORIZATION_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import type {
  EmbeddableLogCategorizationDeps,
  EmbeddableLogCategorizationInput,
} from './log_categorization_embeddable';

export class EmbeddableLogCategorizationFactory
  implements EmbeddableFactoryDefinition<EmbeddableLogCategorizationInput>
{
  public readonly type = EMBEDDABLE_LOG_CATEGORIZATION_TYPE;

  public readonly grouping = [
    {
      id: 'data_visualizer_grid',
      getDisplayName: () => 'Data Visualizer Grid',
    },
  ];

  constructor(
    private readonly name: string,
    private readonly getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
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

  private async getServices(): Promise<EmbeddableLogCategorizationDeps> {
    const [
      { i18n: i18nService, theme, http, uiSettings, notifications, application },
      { lens, data, usageCollection, fieldFormats, charts },
    ] = await this.getStartServices();

    return {
      i18n: i18nService,
      theme,
      data,
      uiSettings,
      http,
      notifications,
      lens,
      usageCollection,
      fieldFormats,
      application,
      charts,
    };
  }

  public async create(input: EmbeddableLogCategorizationInput, parent?: IContainer) {
    const deps = await this.getServices();
    const { EmbeddableLogCategorization } = await import('./log_categorization_embeddable');
    return new EmbeddableLogCategorization(this.type, deps, input, parent);
  }
}
