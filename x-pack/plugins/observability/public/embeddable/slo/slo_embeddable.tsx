/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import { Subscription } from 'rxjs';

import {
  Embeddable as AbstractEmbeddable,
  EmbeddableOutput,
  IContainer,
} from '@kbn/embeddable-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { ALL_VALUE, GetSLOResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import dateMath, { Unit } from '@kbn/datemath';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SloOverview } from './slo_overview';
import type { SloEmbeddableDeps, SloEmbeddableInput } from './types';

// import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';

export const SLO_EMBEDDABLE = 'SLO_EMBEDDABLE';

export function datemathToEpochMillis(
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
  // The type of this embeddable. This will be used to find the appropriate factory
  // to instantiate this kind of embeddable.
  public readonly type = SLO_EMBEDDABLE;
  private subscription: Subscription;
  private node?: HTMLElement;

  constructor(
    private readonly deps: SloEmbeddableDeps,
    initialInput: SloEmbeddableInput,
    parent?: IContainer
  ) {
    super(
      // Input state is irrelevant to this embeddable, just pass it along.
      initialInput,
      // Initial output state - this embeddable does not do anything with output, so just
      // pass along an empty object.
      {},
      // Optional parent component, this embeddable can optionally be rendered inside a container.
      parent
    );

    this.initOutput().finally(() => this.setInitializationFinished());
    this.subscription = new Subscription();
    this.subscription.add(this.getInput$().subscribe(() => this.reload()));
  }

  private async initOutput() {
    const { sloId, sloInstanceId: instanceId } = this.getInput();
    console.log(sloId, '!!sloId');
    console.log(instanceId, '!!sloInstanceId');
    const http = this.deps.http;
    try {
      const response = await http.get<GetSLOResponse>(`/api/observability/slos/${sloId}`, {
        query: {
          ...(!!instanceId && instanceId !== ALL_VALUE && { instanceId }),
        },
      });
      console.log(response, '!!response');
    } catch (error) {
      // ignore error for retrieving slos
    }
  }

  /**
   * Render yourself at the dom node using whatever framework you like, angular, react, or just plain
   * vanilla js.
   * @param node
   */
  public render(node: HTMLElement) {
    this.node = node;
    const start = this.input.timeRange.from;
    const end = this.input.timeRange.to;
    const startTimestamp = datemathToEpochMillis(this.input.timeRange.from);
    const endTimestamp = datemathToEpochMillis(this.input.timeRange.to, 'up');
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

  /**
   * This is mostly relevant for time based embeddables which need to update data
   * even if EmbeddableInput has not changed at all.
   */
  public reload() {
    if (this.node) {
      this.render(this.node);
    }
  }
}
