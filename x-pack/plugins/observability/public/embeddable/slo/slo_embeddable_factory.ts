/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
  EmbeddableFactory,
} from '@kbn/embeddable-plugin/public';
import { SLOEmbeddable, SLO_EMBEDDABLE } from './slo_embeddable';

export type SloListFactory = EmbeddableFactory;
export class SloListFactoryDefinition implements EmbeddableFactoryDefinition {
  public readonly type = SLO_EMBEDDABLE;

  /**
   * In our simple example, we let everyone have permissions to edit this. Most
   * embeddables should check the UI Capabilities service to be sure of
   * the right permissions.
   */
  public async isEditable() {
    return true;
  }

  public async create(initialInput: EmbeddableInput, parent?: IContainer) {
    return new SLOEmbeddable(initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('xpack.observability.sloEmbeddable.displayName', {
      defaultMessage: 'SLO List',
    });
  }
}
