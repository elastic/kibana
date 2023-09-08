/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { InfraClientStartServicesAccessor } from '../../types';
import {
  AssetDetailsEmbeddable,
  AssetDetailsEmbeddableInput,
  ASSET_DETAILS_EMBEDDABLE,
} from './asset_details_embeddable';

export class AssetDetailsEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<AssetDetailsEmbeddableInput>
{
  public readonly type = ASSET_DETAILS_EMBEDDABLE;

  constructor(private getStartServices: InfraClientStartServicesAccessor) {}

  public async isEditable() {
    return false;
  }

  public async create(initialInput: AssetDetailsEmbeddableInput, parent?: IContainer) {
    const [core, plugins, pluginStart] = await this.getStartServices();
    return new AssetDetailsEmbeddable(core, plugins, pluginStart, initialInput, parent);
  }

  public getDisplayName() {
    return i18n.translate('xpack.infra.assetDetailsEmbeddable.displayName', {
      defaultMessage: 'Asset Details',
    });
  }

  public getDescription() {
    return i18n.translate('xpack.infra.assetDetailsEmbeddable.description', {
      defaultMessage: 'Add an asset details view.',
    });
  }

  public getIconType() {
    return 'metricsApp';
  }

  public async getExplicitInput() {
    return {
      title: i18n.translate('xpack.infra.assetDetailsEmbeddable.title', {
        defaultMessage: 'Asset Details',
      }),
    };
  }
}
