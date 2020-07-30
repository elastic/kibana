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

import React from 'react';
import ReactDOM from 'react-dom';
import { isEqual, cloneDeep } from 'lodash';
import { Subscription } from 'rxjs';
import * as Rx from 'rxjs';
import {
  TimeRange,
  Query,
  esFilters,
  Filter,
} from '../../../../../src/plugins/data/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  Embeddable,
  IContainer,
} from '../../../../../src/plugins/embeddable/public';
import { CanvasWorkpad } from '../../types';
import { Canvas } from '../../shareable_runtime/components/canvas';
import { CANVAS_EMBEDDABLE_TYPE } from './canvas_embeddable_factory';

export interface CanvasEmbeddableConfiguration {
  editPath: string;
  editUrl: string;
  editable: boolean;
}

export interface CanvasEmbeddableInput extends EmbeddableInput {
  workpad: CanvasWorkpad;
  id: string;
}

export interface CanvasEmbeddableOutput extends EmbeddableOutput {
  editPath: string;
  editApp: string;
  editUrl: string;
}

export class CanvasEmbeddable extends Embeddable<CanvasEmbeddableInput, CanvasEmbeddableOutput> {
  private subscriptions: Subscription[] = [];
  private domNode: any;
  public readonly type = CANVAS_EMBEDDABLE_TYPE;
  private workpad: CanvasWorkpad;

  constructor(
    { editPath, editUrl, editable }: CanvasEmbeddableConfiguration,
    initialInput: CanvasEmbeddableInput,
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        defaultTitle: initialInput.workpad.name,
        editPath,
        editApp: 'canvas',
        editUrl,
        editable,
      },
      parent
    );
    this.workpad = initialInput.workpad;

    this.subscriptions.push(
      Rx.merge(this.getOutput$(), this.getInput$()).subscribe(() => {
        this.handleChanges();
      })
    );
  }

  public async handleChanges() {
    ReactDOM.render(<Canvas workpad={this.workpad} initialInput={this.input} />, this.domNode)
  }

  /**
   *
   * @param {Element} domNode
   */
  public async render(domNode: HTMLElement) {
    super.render(domNode);

    const div = document.createElement('div');
    div.className = `canvas panel-content panel-content--fullWidth`;
    domNode.appendChild(div);

    this.domNode = div;

    ReactDOM.render(<Canvas workpad={this.workpad} initialInput={this.input} />, this.domNode)

  }

  public async reload() {
    ReactDOM.render(<Canvas workpad={this.workpad} initialInput={this.input} />, this.domNode)
  }

  public destroy() {
    super.destroy();
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
