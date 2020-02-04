/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';

import {
  ObjectStorage,
  ObjectStorageClient,
  IdObject,
} from '../../../../../src/plugins/console/public';

import { TextObject } from '../../../../../src/plugins/console/common/text_object';

import { APP } from '../../common/constants';

class SavedObjectsObjectStorage<O extends IdObject> implements ObjectStorage<O> {
  constructor(private readonly http: HttpSetup) {}

  async update(obj: O) {
    await this.http.put(`${APP.apiPathBase}/text_objects/update`, { body: JSON.stringify(obj) });
  }

  findAll() {
    return this.http.get(`${APP.apiPathBase}/text_objects/get_all`);
  }

  create(obj: Omit<O, 'id'>) {
    return this.http.post(`${APP.apiPathBase}/text_objects/create`, {
      body: JSON.stringify(obj),
    });
  }
}

export const create = ({ http }: { http: HttpSetup }): ObjectStorageClient => ({
  text: new SavedObjectsObjectStorage<TextObject>(http),
});
