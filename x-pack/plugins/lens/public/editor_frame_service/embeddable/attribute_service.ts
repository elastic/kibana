/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EmbeddableInput,
  SavedObjectEmbeddableInput,
  isSavedObjectEmbeddableInput,
  IEmbeddable,
} from '../../../../../../src/plugins/embeddable/public';
import { SavedObjectsClientContract, SimpleSavedObject } from '../../../../../../src/core/public';

export class AttributeService<
  SavedObjectAttributes,
  ValType extends EmbeddableInput & { attributes: SavedObjectAttributes },
  RefType extends SavedObjectEmbeddableInput
> {
  constructor(private type: string, private savedObjectsClient: SavedObjectsClientContract) {}

  public async unwrapAttributes(input: RefType | ValType): Promise<SavedObjectAttributes> {
    if (isSavedObjectEmbeddableInput(input)) {
      const savedObject: SimpleSavedObject<SavedObjectAttributes> = await this.savedObjectsClient.get<
        SavedObjectAttributes
      >(this.type, input.savedObjectId);
      return savedObject.attributes;
    }
    return input.attributes;
  }

  public async wrapAttributes(
    newAttributes: SavedObjectAttributes,
    useRefType: boolean,
    embeddable?: IEmbeddable
  ): Promise<Omit<ValType | RefType, 'id'>> {
    const savedObjectId =
      embeddable && isSavedObjectEmbeddableInput(embeddable.getInput())
        ? (embeddable.getInput() as SavedObjectEmbeddableInput).savedObjectId
        : undefined;

    if (useRefType) {
      if (savedObjectId) {
        await this.savedObjectsClient.update(this.type, savedObjectId, newAttributes);
        return { savedObjectId } as RefType;
      } else {
        const savedItem = await this.savedObjectsClient.create(this.type, newAttributes);
        return { savedObjectId: savedItem.id } as RefType;
      }
    } else {
      return { attributes: newAttributes } as ValType;
    }
  }
}
