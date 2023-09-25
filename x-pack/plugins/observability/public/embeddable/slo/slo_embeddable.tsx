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
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import dateMath from '@kbn/datemath';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SloOverview } from './slo_overview';
import type { SloEmbeddableDeps, SloEmbeddableInput } from './types';

export const SLO_EMBEDDABLE = 'SLO_EMBEDDABLE';

function datemathToEpochMillis(
  value: string,
  round: 'down' | 'up' = 'down',
  forceNow?: Date
): number | null {
  const parsedValue = dateMath.parse(value, { roundUp: round === 'up', forceNow });
  if (!parsedValue || !parsedValue.isValid()) {
    return null;
  }
  return parsedValue.valueOf();
}

export class SLOEmbeddable extends AbstractEmbeddable<SloEmbeddableInput, EmbeddableOutput> {
  public readonly type = SLO_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;

  constructor(
    private readonly deps: SloEmbeddableDeps,
    initialInput: SloEmbeddableInput,
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
        i18n.translate('xpack.observability.sloEmbeddable.displayTitle', {
          defaultMessage: 'SLO Overview',
        })
    );
    const startTimestamp = datemathToEpochMillis(this.input.timeRange!.from);
    const endTimestamp = datemathToEpochMillis(this.input.timeRange!.to, 'up');
    const { sloId, sloInstanceId } = this.getInput();
    const queryClient = new QueryClient();

    const I18nContext = this.deps.i18n.Context;
    ReactDOM.render(
      <I18nContext>
        <KibanaContextProvider services={this.deps}>
          <QueryClientProvider client={queryClient}>
            <SloOverview
              sloId={sloId}
              sloInstanceId={sloInstanceId}
              startTime={startTimestamp}
              endTime={endTimestamp}
            />
          </QueryClientProvider>
        </KibanaContextProvider>
      </I18nContext>,
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
