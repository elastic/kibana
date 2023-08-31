/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Embeddable, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { EmbeddableFlamegraph } from './embeddable_flamegraph';
import { HelloWorldEmbeddableInput } from './hello_world_factory';

export const HELLO_WORLD = 'HELLO_WORLD';

export class HelloWorld extends Embeddable<HelloWorldEmbeddableInput, EmbeddableOutput> {
  readonly type = HELLO_WORLD;
  private _domNode?: HTMLElement;

  render(domNode: HTMLElement) {
    this._domNode = domNode;
    render(<EmbeddableFlamegraph data={this.input.data} />, domNode);
  }

  public destroy() {
    if (this._domNode) {
      unmountComponentAtNode(this._domNode);
    }
  }

  reload() {
    if (this._domNode) {
      this.render(this._domNode);
    }
  }
}
