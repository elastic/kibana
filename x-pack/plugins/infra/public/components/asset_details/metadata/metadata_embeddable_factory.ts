/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import type { InfraClientStartServicesAccessor } from '../../../types';
import {
  MetadataEmbeddable,
  MetadataEmbeddableInput,
  METADATA_EMBEDDABLE,
} from './metadata_embeddable';

export class MetadataEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<MetadataEmbeddableInput>
{
  public readonly type = METADATA_EMBEDDABLE;

  constructor(private getStartServices: InfraClientStartServicesAccessor) {}

  public async isEditable() {
    return false;
  }

  public async create(initialInput: MetadataEmbeddableInput, parent?: IContainer) {
    const [core, plugins, pluginStart] = await this.getStartServices();
    return new MetadataEmbeddable(core, plugins, pluginStart, initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('xpack.infra.metadataEmbeddable.displayName', {
      defaultMessage: 'Metadata',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.infra.metadataEmbeddable.description', {
      defaultMessage: 'Add a table of asset metadata.',
    });
  }

  public getIconType() {
    return 'metricsApp';
  }

  public async getExplicitInput() {
    return {
      title: i18n.translate('xpack.infra.metadataEmbeddable.title', {
        defaultMessage: 'Metadata',
      }),
    };
  }
}
