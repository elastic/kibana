/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/public';
import {
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { COMMON_SLO_GROUPING } from '../overview/slo_embeddable_factory';
import { SLO_ALERTS_EMBEDDABLE, SLOAlertsEmbeddable } from './slo_alerts_embeddable';
import { SloPublicPluginsStart, SloPublicStart } from '../../..';
import { SloAlertsEmbeddableInput } from './types';

export type SloAlertsEmbeddableFactory = EmbeddableFactory;
export class SloAlertsEmbeddableFactoryDefinition implements EmbeddableFactoryDefinition {
  public readonly type = SLO_ALERTS_EMBEDDABLE;

  public readonly grouping = COMMON_SLO_GROUPING;

  constructor(
    private getStartServices: CoreSetup<SloPublicPluginsStart, SloPublicStart>['getStartServices'],
    private kibanaVersion: string
  ) {}

  public async isEditable() {
    return true;
  }

  public async getExplicitInput(): Promise<Partial<SloAlertsEmbeddableInput>> {
    const [coreStart, pluginStart] = await this.getStartServices();
    try {
      const { resolveEmbeddableSloUserInput } = await import('./handle_explicit_input');
      return await resolveEmbeddableSloUserInput(coreStart, pluginStart);
    } catch (e) {
      return Promise.reject();
    }
  }

  public async create(initialInput: SloAlertsEmbeddableInput, parent?: IContainer) {
    try {
      const [coreStart, pluginsStart] = await this.getStartServices();
      const deps = { ...coreStart, ...pluginsStart };
      return new SLOAlertsEmbeddable(deps, initialInput, this.kibanaVersion, parent);
    } catch (e) {
      return new ErrorEmbeddable(e, initialInput, parent);
    }
  }

  public getDescription() {
    return i18n.translate('xpack.slo.sloAlertsEmbeddable.description', {
      defaultMessage: 'Get an overview of your SLO alerts',
    });
  }

  public getDisplayName() {
    return i18n.translate('xpack.slo.sloAlertsEmbeddable.displayName', {
      defaultMessage: 'SLO Alerts',
    });
  }

  public getIconType() {
    return 'alert';
  }
}
