/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { EmbeddableStateWithType } from '../../../../../src/plugins/embeddable/common/types';
import type { IContainer } from '../../../../../src/plugins/embeddable/public/lib/containers/i_container';
import type { EmbeddableFactoryDefinition } from '../../../../../src/plugins/embeddable/public/lib/embeddables/embeddable_factory_definition';
import { APP_ICON, MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { getMapEmbeddableDisplayName } from '../../common/i18n_getters';
import { extractReferences } from '../../common/migrations/references';
import { lazyLoadMapModules } from '../lazy_load_bundle';
import type { MapByReferenceInput, MapByValueInput, MapEmbeddableInput } from './types';

export class MapEmbeddableFactory implements EmbeddableFactoryDefinition {
  type = MAP_SAVED_OBJECT_TYPE;
  savedObjectMetaData = {
    name: i18n.translate('xpack.maps.mapSavedObjectLabel', {
      defaultMessage: 'Map',
    }),
    type: MAP_SAVED_OBJECT_TYPE,
    getIconForSavedObject: () => APP_ICON,
  };

  async isEditable() {
    const { getMapsCapabilities } = await lazyLoadMapModules();
    return getMapsCapabilities().save as boolean;
  }

  // Not supported yet for maps types.
  canCreateNew() {
    return false;
  }

  getDisplayName() {
    return getMapEmbeddableDisplayName();
  }

  createFromSavedObject = async (
    savedObjectId: string,
    input: MapEmbeddableInput,
    parent?: IContainer
  ) => {
    if (!(input as MapByReferenceInput).savedObjectId) {
      (input as MapByReferenceInput).savedObjectId = savedObjectId;
    }
    return this.create(input, parent);
  };

  create = async (input: MapEmbeddableInput, parent?: IContainer) => {
    const { MapEmbeddable } = await lazyLoadMapModules();
    return new MapEmbeddable(
      {
        editable: await this.isEditable(),
      },
      input,
      parent
    );
  };

  extract(state: EmbeddableStateWithType) {
    const maybeMapByValueInput = state as EmbeddableStateWithType | MapByValueInput;

    if ((maybeMapByValueInput as MapByValueInput).attributes !== undefined) {
      const { references } = extractReferences({
        attributes: (maybeMapByValueInput as MapByValueInput).attributes,
      });

      return { state, references };
    }

    return { state, references: [] };
  }
}
