/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Embeddable, EmbeddableOutput, IContainer } from '@kbn/embeddable-plugin/public';
import { i18n } from '@kbn/i18n';
import { EMBEDDABLE_THREADS } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import {
  ProfilingEmbeddableProvider,
  ProfilingEmbeddablesDependencies,
} from '../profiling_embeddable_provider';
import { EmbeddableThreadsEmbeddableInput } from './embeddable_threads_factory';

export class EmbeddableThreads extends Embeddable<
  EmbeddableThreadsEmbeddableInput,
  EmbeddableOutput
> {
  readonly type = EMBEDDABLE_THREADS;
  private _domNode?: HTMLElement;

  constructor(
    private deps: ProfilingEmbeddablesDependencies,
    initialInput: EmbeddableThreadsEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);
  }

  render(domNode: HTMLElement) {
    this._domNode = domNode;
    const { rangeFrom, rangeTo, kuery } = this.input;
    console.log('### caue  render:', { rangeFrom, rangeTo, kuery });
    render(
      <ProfilingEmbeddableProvider deps={this.deps}>
        <div style={{ width: '100%' }}>
          {i18n.translate('xpack.profiling..div.caueLabel', { defaultMessage: 'caue' })}
        </div>
      </ProfilingEmbeddableProvider>,
      domNode
    );
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
