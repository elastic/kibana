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
  EmbeddableInput,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { SLOEmbeddable, SLO_EMBEDDABLE } from './slo_embeddable';
import { ObservabilityPublicPluginsStart, ObservabilityPublicStart } from '../..';
// import { resolveSloEmbeddableUserInput } from './handle_explicit_input';

export type SloListFactory = EmbeddableFactory;
export class SloListFactoryDefinition implements EmbeddableFactoryDefinition {
  public readonly type = SLO_EMBEDDABLE;

  constructor(
    private getStartServices: CoreSetup<
      ObservabilityPublicPluginsStart,
      ObservabilityPublicStart
    >['getStartServices']
  ) {}

  /**
   * In our simple example, we let everyone have permissions to edit this. Most
   * embeddables should check the UI Capabilities service to be sure of
   * the right permissions.
   */
  public async isEditable() {
    return true;
  }

  public async getExplicitInput() {
    const [coreStart, pluginStart] = await this.getStartServices();
    try {
      const { resolveEmbeddableSloUserInput } = await import('./handle_explicit_input');
      return await resolveEmbeddableSloUserInput(coreStart, pluginStart);
    } catch (e) {
      return Promise.reject();
    }
  }

  public async create(initialInput: EmbeddableInput, parent?: IContainer) {
    console.log(initialInput, '!!Input');
    return new SLOEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('xpack.observability.sloEmbeddable.displayName', {
      defaultMessage: 'SLO List',
    });
  }
}
