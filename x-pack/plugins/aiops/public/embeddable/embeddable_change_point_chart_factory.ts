/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import type {
  EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
  EmbeddableChangePointType,
} from '@kbn/aiops-change-point-detection/constants';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../types';
import type { EmbeddableChangePointChartInput } from './embeddable_change_point_chart';
import { EmbeddableChangePointChart } from './embeddable_change_point_chart';

export interface EmbeddableChangePointChartStartServices {
  data: DataPublicPluginStart;
}

export type EmbeddableChangePointChartType = typeof EMBEDDABLE_CHANGE_POINT_CHART_TYPE;

export class EmbeddableChangePointChartFactory implements EmbeddableFactoryDefinition {
  public readonly grouping = [
    {
      id: 'ml',
      getDisplayName: () =>
        i18n.translate('xpack.aiops.navMenu.mlAppNameText', {
          defaultMessage: 'Machine Learning',
        }),
      getIconType: () => 'machineLearningApp',
    },
  ];

  constructor(
    public readonly type: EmbeddableChangePointType,
    private readonly name: string,
    private readonly getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
  ) {}

  public isEditable = async () => {
    return true;
  };

  getDisplayName() {
    return this.name;
  }

  canCreateNew() {
    return true;
  }

  public async getExplicitInput(): Promise<Partial<EmbeddableChangePointChartInput>> {
    const [coreStart, pluginStart] = await this.getStartServices();

    try {
      const { resolveEmbeddableChangePointUserInput } = await import('./handle_explicit_input');
      return await resolveEmbeddableChangePointUserInput(coreStart, pluginStart);
    } catch (e) {
      return Promise.reject();
    }
  }

  async create(input: EmbeddableChangePointChartInput, parent?: IContainer) {
    try {
      const [
        { i18n: i18nService, theme, http, uiSettings, notifications },
        { lens, data, usageCollection, fieldFormats },
      ] = await this.getStartServices();

      return new EmbeddableChangePointChart(
        this.type,
        {
          theme,
          http,
          i18n: i18nService,
          uiSettings,
          data,
          notifications,
          lens,
          usageCollection,
          fieldFormats,
        },
        input,
        parent
      );
    } catch (e) {
      return new ErrorEmbeddable(e, input, parent);
    }
  }
}
