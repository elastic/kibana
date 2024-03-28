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
  APMThroughputChartEmbeddable,
  APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE,
} from './embeddable';
import { ApmPluginStartDeps, ApmPluginStart } from '../../../plugin';
import type { APMAlertingVizEmbeddableInput } from '../types';

export type APMAlertingThroughputChartEmbeddableFactory = EmbeddableFactory;
export class APMAlertingThroughputChartEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition
{
  public readonly type = APM_ALERTING_THROUGHPUT_CHART_EMBEDDABLE;

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
    initialInput: APMAlertingVizEmbeddableInput,
    parent?: IContainer
  ) {
    try {
      const [coreStart, pluginsStart] = await this.getStartServices();
      return new APMThroughputChartEmbeddable(
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
    return i18n.translate('xpack.apm.throughputChartEmbeddable.description', {
      defaultMessage: "Get an overview of your service's throughput.",
    });
  }

  public getDisplayName() {
    return i18n.translate('xpack.apm.throughputChartEmbeddable.displayName', {
      defaultMessage: 'APM Service Throughput',
    });
  }

  public getIconType() {
    return 'visGauge';
  }
}
