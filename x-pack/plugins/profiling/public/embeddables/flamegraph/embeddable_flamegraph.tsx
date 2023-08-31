/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Embeddable, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { EMBEDDABLE_FLAMEGRAPH } from '@kbn/observability-shared-plugin/public';
import { EmbeddableFlamegraphEmbeddableInput } from './embeddable_flamegraph_factory';
import { FlameGraph } from '../../components/flamegraph';

export class EmbeddableFlamegraph extends Embeddable<
  EmbeddableFlamegraphEmbeddableInput,
  EmbeddableOutput
> {
  readonly type = EMBEDDABLE_FLAMEGRAPH;
  private _domNode?: HTMLElement;

  render(domNode: HTMLElement) {
    this._domNode = domNode;
    const { data } = this.input;
    render(
      <EuiPanel>
        <EuiFlexGroup direction="column" style={{ height: '100%' }}>
          <EuiFlexItem>
            {data && (
              <FlameGraph
                primaryFlamegraph={data}
                showInformationWindow={false}
                id="embddable_profiling"
                toggleShowInformationWindow={() => {}}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>,
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
