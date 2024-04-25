/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';
import { i18n } from '@kbn/i18n';

import {
  Embeddable as AbstractEmbeddable,
  EmbeddableOutput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { APMEmbeddableContext } from '../embeddable_context';
import { APMThroughputChartEmbeddableComponent } from './chart';
import type { APMThroughputChartEmbeddableInput } from './types';
import type { EmbeddableDeps } from '../types';

export const APM_THROUGHPUT_CHART_EMBEDDABLE = 'APM_THROUGHPUT_CHART_EMBEDDABLE';

export class APMThroughputChartEmbeddable extends AbstractEmbeddable<
  APMThroughputChartEmbeddableInput,
  EmbeddableOutput
> {
  public readonly type = APM_THROUGHPUT_CHART_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;

  constructor(
    private readonly deps: EmbeddableDeps,
    initialInput: APMThroughputChartEmbeddableInput,
    parent?: IContainer
  ) {
    super(initialInput, {}, parent);

    this.subscription = new Subscription();
    this.subscription.add(this.getInput$().subscribe(() => this.reload()));
  }

  setTitle(title: string) {
    this.updateInput({ title });
  }

  public render(node: HTMLElement) {
    this.node = node;
    this.setTitle(
      this.input.title ||
        i18n.translate('xpack.apm.throughputEmbeddable.displayTitle', {
          defaultMessage: 'Throughput',
        })
    );
    this.input.lastReloadRequestTime = Date.now();

    const input = this.getInput();

    ReactDOM.render(
      <APMEmbeddableContext
        deps={this.deps}
        serviceName={input.serviceName}
        transactionName={input.transactionName}
        transactionType={input.transactionType}
        environment={input.environment}
        rangeFrom={input.rangeFrom}
        rangeTo={input.rangeTo}
      >
        <APMThroughputChartEmbeddableComponent />
      </APMEmbeddableContext>,
      node
    );
  }

  public reload() {
    if (this.node) {
      this.render(this.node);
    }
  }

  public destroy() {
    super.destroy();
    this.subscription.unsubscribe();
    if (this.node) {
      ReactDOM.unmountComponentAtNode(this.node);
    }
  }
}
