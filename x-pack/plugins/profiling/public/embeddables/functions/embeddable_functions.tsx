/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Embeddable, EmbeddableOutput, IContainer } from '@kbn/embeddable-plugin/public';
import { EMBEDDABLE_FUNCTIONS } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { AsyncEmbeddableComponent } from '../async_embeddable_component';
import { EmbeddableFunctionsEmbeddableInput } from './embeddable_functions_factory';
import { EmbeddableFunctionsGrid } from './embeddable_functions_grid';
import {
  ProfilingEmbeddableProvider,
  ProfilingEmbeddablesDependencies,
} from '../profiling_embeddable_provider';
import { ProfilingEmbeddableSearchBar } from '../profiling_embeddable_search_bar';

export class EmbeddableFunctions extends Embeddable<
  EmbeddableFunctionsEmbeddableInput,
  EmbeddableOutput
> {
  readonly type = EMBEDDABLE_FUNCTIONS;
  private _domNode?: HTMLElement;

  constructor(
    private deps: ProfilingEmbeddablesDependencies,
    initialInput: EmbeddableFunctionsEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);
  }

  render(domNode: HTMLElement) {
    this._domNode = domNode;
    const { data, isLoading, rangeFrom, rangeTo, onSearchBarFilterChange, searchBarFilter } =
      this.input;
    const totalSeconds = (rangeTo - rangeFrom) / 1000;
    render(
      <ProfilingEmbeddableProvider deps={this.deps}>
        <EuiFlexGroup direction="column">
          {onSearchBarFilterChange ? (
            <EuiFlexItem grow={false}>
              <ProfilingEmbeddableSearchBar
                onQuerySubmit={onSearchBarFilterChange}
                kuery={searchBarFilter?.filters}
              />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            <AsyncEmbeddableComponent isLoading={isLoading}>
              <div style={{ width: '100%' }}>
                <EmbeddableFunctionsGrid data={data} totalSeconds={totalSeconds} />
              </div>
            </AsyncEmbeddableComponent>
          </EuiFlexItem>
        </EuiFlexGroup>
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
