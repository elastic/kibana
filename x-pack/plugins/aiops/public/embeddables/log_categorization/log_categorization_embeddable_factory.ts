/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { StartServicesAccessor } from '@kbn/core/public';
import type { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';

import { EMBEDDABLE_LOG_CATEGORIZATION_TYPE } from '@kbn/aiops-log-pattern-analysis/embeddable';
import type { EmbeddableLogCategorizationInput } from '@kbn/aiops-log-pattern-analysis/embeddable';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../../types';
import type { EmbeddableLogCategorizationDeps } from './log_categorization_embeddable';

export class EmbeddableLogCategorizationFactory
  implements EmbeddableFactoryDefinition<EmbeddableLogCategorizationInput>
{
  public readonly type = EMBEDDABLE_LOG_CATEGORIZATION_TYPE;

  public readonly grouping = [
    {
      id: 'embeddable_log_categorization',
      getDisplayName: () => 'Pattern Analysis',
    },
  ];

  constructor(
    private readonly name: string,
    private readonly getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
  ) {}

  public getName() {
    return this.name;
  }

  public async isEditable() {
    return false;
  }

  public canCreateNew() {
    return false;
  }

  public getDisplayName() {
    return i18n.translate('xpack.aiops.embeddableLogCategorization.displayName', {
      defaultMessage: 'Pattern analysis',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.aiops.embeddableLogCategorization.description', {
      defaultMessage: 'Pattern analysis',
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
    const [deps, { EmbeddableLogCategorization }] = await Promise.all([
      this.getServices(),
      import('./log_categorization_embeddable'),
    ]);
    return new EmbeddableLogCategorization(this.type, deps, input, parent);
  }
}
