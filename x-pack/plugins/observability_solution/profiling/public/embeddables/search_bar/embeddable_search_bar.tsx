/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import { Embeddable, EmbeddableOutput, IContainer } from '@kbn/embeddable-plugin/public';
import { EMBEDDABLE_PROFILING_SEARCH_BAR } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { ProfilingSearchBar } from '../../components/profiling_app_page_template/profiling_search_bar';
import {
  ProfilingEmbeddableProvider,
  ProfilingEmbeddablesDependencies,
} from '../profiling_embeddable_provider';
import { EmbeddableSearchBarEmbeddableInput } from './embeddable_search_bar_factory';

export class EmbeddableSearchBar extends Embeddable<
  EmbeddableSearchBarEmbeddableInput,
  EmbeddableOutput
> {
  readonly type = EMBEDDABLE_PROFILING_SEARCH_BAR;
  private _domNode?: HTMLElement;

  constructor(
    private deps: ProfilingEmbeddablesDependencies,
    initialInput: EmbeddableSearchBarEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);
  }

  render(domNode: HTMLElement) {
    this._domNode = domNode;
    const { showDatePicker, kuery, onQuerySubmit, onRefresh, rangeFrom, rangeTo } = this.input;

    render(
      <ProfilingEmbeddableProvider deps={this.deps}>
        <div
          css={css`
            width: 100%;
          `}
        >
          <ProfilingSearchBar
            showDatePicker={showDatePicker ?? true}
            showSubmitButton
            kuery={kuery}
            onQuerySubmit={({ dateRange, query }) => {
              onQuerySubmit({
                dateRange,
                query: typeof query?.query === 'string' ? query.query : '',
              });
            }}
            onRefresh={onRefresh}
            onRefreshClick={onRefresh}
            showQueryMenu={false}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
          />
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
