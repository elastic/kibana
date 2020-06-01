/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  IContainer,
  EmbeddableInput,
  EmbeddableFactoryDefinition,
} from '../../../../../src/plugins/embeddable/public';
import { ResolverEmbeddable } from './embeddable';

export class ResolverEmbeddableFactory implements EmbeddableFactoryDefinition {
  public readonly type = 'resolver';

  public async isEditable() {
    return true;
  }

  public async create(initialInput: EmbeddableInput, parent?: IContainer) {
    return new ResolverEmbeddable(initialInput, {}, parent);
  }

  public getDisplayName() {
    return i18n.translate('xpack.siem.endpoint.resolver.displayNameTitle', {
      defaultMessage: 'Resolver',
    });
  }
}
