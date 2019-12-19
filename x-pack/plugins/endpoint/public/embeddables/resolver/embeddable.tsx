/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { AppRoot } from './view';
import { storeFactory } from './store';
import {
  EmbeddableInput,
  IContainer,
  Embeddable,
} from '../../../../../../src/plugins/embeddable/public';
import { HttpSetup } from '../../../../../../src/core/public';

export class ResolverEmbeddable extends Embeddable {
  public readonly type = 'resolver';
  private httpService: HttpSetup;
  private lastRenderTarget?: Element;
  constructor(initialInput: EmbeddableInput, httpService: HttpSetup, parent?: IContainer) {
    super(
      // Input state is irrelevant to this embeddable, just pass it along.
      initialInput,
      // Initial output state - this embeddable does not do anything with output, so just
      // pass along an empty object.
      {},
      // Optional parent component, this embeddable can optionally be rendered inside a container.
      parent
    );
    this.httpService = httpService;
  }

  public render(node: HTMLElement) {
    if (this.lastRenderTarget !== undefined) {
      ReactDOM.unmountComponentAtNode(this.lastRenderTarget);
    }
    this.lastRenderTarget = node;
    // TODO, figure out how to destroy middleware
    const { store } = storeFactory({ httpServiceBase: this.httpService });
    ReactDOM.render(<AppRoot store={store} />, node);
  }

  public reload(): void {
    throw new Error('Method not implemented.');
  }

  public destroy(): void {
    if (this.lastRenderTarget !== undefined) {
      ReactDOM.unmountComponentAtNode(this.lastRenderTarget);
    }
  }
}
