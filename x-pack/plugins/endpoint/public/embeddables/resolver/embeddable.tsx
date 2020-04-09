/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { Provider } from 'react-redux';
import { Resolver } from './view';
import { storeFactory } from './store';
import { Embeddable } from '../../../../../../src/plugins/embeddable/public';

export class ResolverEmbeddable extends Embeddable {
  public readonly type = 'resolver';
  private lastRenderTarget?: Element;

  public render(node: HTMLElement) {
    if (this.lastRenderTarget !== undefined) {
      ReactDOM.unmountComponentAtNode(this.lastRenderTarget);
    }
    this.lastRenderTarget = node;
    const { store } = storeFactory();
    ReactDOM.render(
      <Provider store={store}>
        <Resolver />
      </Provider>,
      node
    );
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
