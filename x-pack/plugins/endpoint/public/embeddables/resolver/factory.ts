/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  EmbeddableFactoryDefinition,
  IContainer,
  EmbeddableInput,
} from '../../../../../../src/plugins/embeddable/public';
import { ResolverEmbeddable } from './embeddable';

export const createResolverEmbeddableFactory = (): EmbeddableFactoryDefinition => ({
  type: 'resolver',

  isEditable: async () => true,

  create: async (initialInput: EmbeddableInput, parent?: IContainer) =>
    new ResolverEmbeddable(initialInput, {}, parent),

  getDisplayName: () =>
    i18n.translate('xpack.endpoint.resolver.displayNameTitle', {
      defaultMessage: 'Resolver',
    }),
});
