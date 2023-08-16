/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '../../common/constants';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../types';
import {
  EmbeddableChangePointChart,
  EmbeddableChangePointChartInput,
} from './embeddable_change_point_chart';

export interface EmbeddableChangePointChartStartServices {
  data: DataPublicPluginStart;
}

export type EmbeddableChangePointChartType = typeof EMBEDDABLE_CHANGE_POINT_CHART_TYPE;

export class EmbeddableChangePointChartFactory implements EmbeddableFactoryDefinition {
  public readonly type = EMBEDDABLE_CHANGE_POINT_CHART_TYPE;

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
    private readonly getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
  ) {}

  public isEditable = async () => {
    return true;
  };

  getDisplayName() {
    return i18n.translate('xpack.aiops.embeddableChangePointChartDisplayName', {
      defaultMessage: 'Change point detection',
    });
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
      const [{ i18n: i18nService, theme, http, uiSettings, notifications }, { lens, data }] =
        await this.getStartServices();

      return new EmbeddableChangePointChart(
        {
          theme,
          http,
          i18n: i18nService,
          uiSettings,
          data,
          notifications,
          lens,
        },
        input,
        parent
      );
    } catch (e) {
      return new ErrorEmbeddable(e, input, parent);
    }
  }
}
