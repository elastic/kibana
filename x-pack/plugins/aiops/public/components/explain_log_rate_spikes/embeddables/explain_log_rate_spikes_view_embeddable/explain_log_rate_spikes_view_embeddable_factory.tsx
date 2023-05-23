/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StartServicesAccessor } from '@kbn/core/public';
import { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { EXPLAIN_LOG_RATE_SPIKES_EMBEDDABLE_TYPE } from './constants';
import {
  ExplainLogRateSpikesEmbeddableInput,
  ExplainLogRateSpikesEmbeddableServices,
} from './explain_log_rate_spikes_view_embeddable';
import { AiopsPluginStart, AiopsPluginStartDeps } from '../../../../types';

export class ExplainLogRateSpikesViewEmbeddableFactory
  implements EmbeddableFactoryDefinition<ExplainLogRateSpikesEmbeddableInput>
{
  public readonly type = EXPLAIN_LOG_RATE_SPIKES_EMBEDDABLE_TYPE;

  public readonly grouping = [
    {
      id: 'explain_log_rate_spikes_view',
      getDisplayName: () => 'Explain Log Rate Spikes View',
    },
  ];

  constructor(
    private getStartServices: StartServicesAccessor<AiopsPluginStartDeps, AiopsPluginStart>
  ) {}

  public async isEditable() {
    return false;
  }

  public canCreateNew() {
    return false;
  }

  public getDisplayName() {
    return i18n.translate('xpack.explainLogRateSpikesView.displayName', {
      defaultMessage: 'Explain log rate spikes view',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.explainLogRateSpikesView.description', {
      defaultMessage: 'Analyzes log rate spikes in Elasticsearch indices.',
    });
  }

  private async getServices(): Promise<ExplainLogRateSpikesEmbeddableServices> {
    const [coreStart, pluginsStart] = await this.getStartServices();
    return [coreStart, pluginsStart];
  }

  public async create(initialInput: ExplainLogRateSpikesEmbeddableInput, parent?: IContainer) {
    const [coreStart, pluginsStart] = await this.getServices();
    const { ExplainLogRateSpikesEmbeddable } = await import(
      './explain_log_rate_spikes_view_embeddable'
    );
    return new ExplainLogRateSpikesEmbeddable(initialInput, [coreStart, pluginsStart], parent);
  }
}
