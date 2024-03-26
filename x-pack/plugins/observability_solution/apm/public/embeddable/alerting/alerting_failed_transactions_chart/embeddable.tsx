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
import { type CoreStart } from '@kbn/core/public';
import { APMEmbeddableContext } from '../../embeddable_context';
import { APMAlertingFailedTransactionsChart } from './chart';
import type { APMAlertingFailedTransactionsChartEmbeddableInput } from './types';
import type { ApmPluginStartDeps } from '../../../plugin';

export const APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE =
  'APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE';

interface APMFailedTransactionsChartEmbeddableDeps {
  core: CoreStart;
  plugins: ApmPluginStartDeps;
}

export class APMFailedTransactionsChartEmbeddable extends AbstractEmbeddable<
  APMAlertingFailedTransactionsChartEmbeddableInput,
  EmbeddableOutput
> {
  public readonly type = APM_ALERTING_FAILED_TRANSACTIONS_CHART_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;

  constructor(
    private readonly deps: APMFailedTransactionsChartEmbeddableDeps,
    initialInput: APMAlertingFailedTransactionsChartEmbeddableInput,
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
        i18n.translate('xpack.apm.failedTransactionsEmbeddable.displayTitle', {
          defaultMessage: 'Failed transactions',
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
        <APMAlertingFailedTransactionsChart
          rule={input.rule}
          alert={input.alert}
          timeZone={input.timeZone}
          rangeFrom={input.rangeFrom}
          rangeTo={input.rangeTo}
          offset={input.offset}
          comparisonEnabled={input.comparisonEnabled}
        />
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
