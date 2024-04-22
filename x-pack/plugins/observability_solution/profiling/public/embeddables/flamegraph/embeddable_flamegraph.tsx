/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Embeddable, EmbeddableOutput, IContainer } from '@kbn/embeddable-plugin/public';
import { EMBEDDABLE_FLAMEGRAPH } from '@kbn/observability-shared-plugin/public';
import { createFlameGraph } from '@kbn/profiling-utils';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { profilingShowErrorFrames } from '@kbn/observability-plugin/common';
import { FlameGraph } from '../../components/flamegraph';
import { AsyncEmbeddableComponent } from '../async_embeddable_component';
import {
  ProfilingEmbeddableProvider,
  ProfilingEmbeddablesDependencies,
} from '../profiling_embeddable_provider';
import { EmbeddableFlamegraphEmbeddableInput } from './embeddable_flamegraph_factory';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';

export class EmbeddableFlamegraph extends Embeddable<
  EmbeddableFlamegraphEmbeddableInput,
  EmbeddableOutput
> {
  readonly type = EMBEDDABLE_FLAMEGRAPH;
  private _domNode?: HTMLElement;

  constructor(
    private deps: ProfilingEmbeddablesDependencies,
    initialInput: EmbeddableFlamegraphEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);
  }

  render(domNode: HTMLElement) {
    this._domNode = domNode;
    render(
      <ProfilingEmbeddableProvider deps={this.deps}>
        <Flamegraph {...this.input} />
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

function Flamegraph({ isLoading, data }: EmbeddableFlamegraphEmbeddableInput) {
  const { core } = useProfilingDependencies().start;
  const showErrorFrames = core.uiSettings.get<boolean>(profilingShowErrorFrames);
  const flamegraph = !isLoading && data ? createFlameGraph(data, showErrorFrames) : undefined;
  return (
    <AsyncEmbeddableComponent isLoading={isLoading}>
      <>
        {flamegraph && (
          <FlameGraph primaryFlamegraph={flamegraph} id="embddable_profiling" isEmbedded />
        )}
      </>
    </AsyncEmbeddableComponent>
  );
}
