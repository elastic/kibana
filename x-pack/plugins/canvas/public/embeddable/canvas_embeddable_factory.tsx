/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { first } from 'rxjs/operators';
import { SavedObjectAttributes } from '../../../../../src/core/public';
import {
  EmbeddableFactoryDefinition,
  EmbeddableOutput,
  ErrorEmbeddable,
  IContainer,
} from '../../../../../src/plugins/embeddable/public';
import { StartServicesGetter } from '../../../../../src/plugins/kibana_utils/public';
import { CanvasEmbeddable, CanvasEmbeddableInput, CanvasEmbeddableOutput } from './canvas_embeddable';
import { CanvasStartDeps } from '../plugin';
import { CanvasWorkpad } from '../../types';

interface CanvasEmbeddableAttributes extends SavedObjectAttributes {
  'canvas-workpad': string;
}

export const CANVAS_EMBEDDABLE_TYPE = 'canvas';

export interface CanvasEmbeddableFactoryDeps {
  start: StartServicesGetter<CanvasStartDeps>;
}

export class CanvasEmbeddableFactory
  implements
    EmbeddableFactoryDefinition<
      CanvasEmbeddableInput,
      CanvasEmbeddableOutput | EmbeddableOutput,
      CanvasEmbeddable,
      CanvasEmbeddableAttributes
    > {
  public readonly type = CANVAS_EMBEDDABLE_TYPE;

  constructor(private readonly deps: CanvasEmbeddableFactoryDeps) {}

  public async isEditable() {
    return this.deps.start().core.application.capabilities.canvas.save as boolean;
  }

  public getDisplayName() {
    return i18n.translate('canvas.displayName', {
      defaultMessage: 'canvas embeddable',
    });
  }

  public async getCurrentAppId() {
    return await this.deps.start().core.application.currentAppId$.pipe(first()).toPromise();
  }

  public async createFromSavedObject(
    input: CanvasEmbeddableInput,
    parent?: IContainer
  ): Promise<CanvasEmbeddable | ErrorEmbeddable> {
    const savedObjectsClient = this.deps.start().core.savedObjects.client;

    try {
      const savedObject = await savedObjectsClient.get('canvas-workpad', input.id!);
      const workpad: CanvasWorkpad = {
        colors: savedObject['canvas-workpad.colors'],
        css: savedObject['canvas-workpad.css'],
        height: savedObject['canvas-workpad.height'],
        name: savedObject['canvas-workpad.name'],
        page: savedObject['canvas-workpad.page'],
        pages: savedObject['canvas-workpad.pages'],
        variables: savedObject['canvas-workpad.variables'],
        width: savedObject['canvas-workpad.width'],
      };
      return this.create({ ...input, workpad }, parent);
    } catch (e) {
      console.error(e); // eslint-disable-line no-console
      return new ErrorEmbeddable(e, input, parent);
    }
  }

  public async create(input: CanvasEmbeddableInput, parent?: IContainer) {
    if (input.workpad) {
      return new CanvasEmbeddable({
        editUrl: '',
        editPath: '',
        editable: false,
      }, input, parent);
    } else if (input.id) {
      return this.createFromSavedObject(input, parent);
    }
  }
}
