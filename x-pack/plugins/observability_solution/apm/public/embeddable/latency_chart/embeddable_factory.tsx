/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/public';
import {
  IContainer,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
  ErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import {
  APMLatencyChartEmbeddable,
  APM_LATENCY_CHART_EMBEDDABLE,
} from './embeddable';
import { ApmPluginStartDeps, ApmPluginStart } from '../../plugin';
import type { APMLatencyChartEmbeddableInput } from './types';

export type APMLatencyChartEmbeddableFactory = EmbeddableFactory;
export class APMLatencyChartEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition
{
  public readonly type = APM_LATENCY_CHART_EMBEDDABLE;

  constructor(
    private getStartServices: CoreSetup<
      ApmPluginStartDeps,
      ApmPluginStart
    >['getStartServices']
  ) {}

  public async isEditable() {
    return true;
  }

  public async create(
    initialInput: APMLatencyChartEmbeddableInput,
    parent?: IContainer
  ) {
    try {
      const [coreStart, pluginsStart] = await this.getStartServices();
      return new APMLatencyChartEmbeddable(
        {
          core: coreStart,
          plugins: pluginsStart,
        },
        initialInput,
        parent
      );
    } catch (e) {
      return new ErrorEmbeddable(e, initialInput, parent);
    }
  }

  public getDescription() {
    return i18n.translate('xpack.apm.latencyChartEmbeddable.description', {
      defaultMessage: "Get an overview of your service's latency.",
    });
  }

  public getDisplayName() {
    return i18n.translate('xpack.apm.latencyChartEmbeddable.displayName', {
      defaultMessage: 'APM Service Latency',
    });
  }

  public getIconType() {
    return 'visGauge';
  }
}
