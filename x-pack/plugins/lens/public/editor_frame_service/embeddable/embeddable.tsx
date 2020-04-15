/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import {
  Query,
  TimeRange,
  Filter,
  IIndexPattern,
  TimefilterContract,
} from 'src/plugins/data/public';

import { Subscription } from 'rxjs';
import { ReactExpressionRendererType } from '../../../../../../src/plugins/expressions/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../../src/plugins/visualizations/public';

import {
  Embeddable as AbstractEmbeddable,
  EmbeddableOutput,
  IContainer,
  EmbeddableInput,
} from '../../../../../../src/plugins/embeddable/public';
import { Document, DOC_TYPE } from '../../persistence';
import { ExpressionWrapper } from './expression_wrapper';

export interface LensEmbeddableConfiguration {
  savedVis: Document;
  editUrl: string;
  editable: boolean;
  indexPatterns?: IIndexPattern[];
}

export interface LensEmbeddableInput extends EmbeddableInput {
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filter[];
}

export interface LensEmbeddableOutput extends EmbeddableOutput {
  indexPatterns?: IIndexPattern[];
}

export class Embeddable extends AbstractEmbeddable<LensEmbeddableInput, LensEmbeddableOutput> {
  type = DOC_TYPE;

  private expressionRenderer: ReactExpressionRendererType;
  private savedVis: Document;
  private domNode: HTMLElement | Element | undefined;
  private subscription: Subscription;
  private autoRefreshFetchSubscription: Subscription;

  private currentContext: {
    timeRange?: TimeRange;
    query?: Query;
    filters?: Filter[];
    lastReloadRequestTime?: number;
  } = {};

  constructor(
    timefilter: TimefilterContract,
    expressionRenderer: ReactExpressionRendererType,
    { savedVis, editUrl, editable, indexPatterns }: LensEmbeddableConfiguration,
    initialInput: LensEmbeddableInput,
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        defaultTitle: savedVis.title,
        savedObjectId: savedVis.id,
        editable,
        // passing edit url and index patterns to the output of this embeddable for
        // the container to pick them up and use them to configure filter bar and
        // config dropdown correctly.
        editUrl,
        indexPatterns,
      },
      parent
    );

    this.expressionRenderer = expressionRenderer;
    this.savedVis = savedVis;
    this.subscription = this.getInput$().subscribe(input => this.onContainerStateChanged(input));
    this.onContainerStateChanged(initialInput);

    this.autoRefreshFetchSubscription = timefilter
      .getAutoRefreshFetch$()
      .subscribe(this.reload.bind(this));
  }

  public supportedTriggers() {
    switch (this.savedVis.visualizationType) {
      case 'lnsXY':
        // TODO: case 'lnsDatatable':
        return [VIS_EVENT_TO_TRIGGER.filter];

      case 'lnsMetric':
      default:
        return [];
    }
  }

  onContainerStateChanged(containerState: LensEmbeddableInput) {
    const cleanedFilters = containerState.filters
      ? containerState.filters.filter(filter => !filter.meta.disabled)
      : undefined;
    if (
      !_.isEqual(containerState.timeRange, this.currentContext.timeRange) ||
      !_.isEqual(containerState.query, this.currentContext.query) ||
      !_.isEqual(cleanedFilters, this.currentContext.filters)
    ) {
      this.currentContext = {
        timeRange: containerState.timeRange,
        query: containerState.query,
        lastReloadRequestTime: this.currentContext.lastReloadRequestTime,
        filters: cleanedFilters,
      };

      if (this.domNode) {
        this.render(this.domNode);
      }
    }
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode: HTMLElement | Element) {
    this.domNode = domNode;
    render(
      <ExpressionWrapper
        ExpressionRenderer={this.expressionRenderer}
        expression={this.savedVis.expression}
        context={this.currentContext}
      />,
      domNode
    );
  }

  destroy() {
    super.destroy();
    if (this.domNode) {
      unmountComponentAtNode(this.domNode);
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.autoRefreshFetchSubscription.unsubscribe();
  }

  reload() {
    const currentTime = Date.now();
    if (this.currentContext.lastReloadRequestTime !== currentTime) {
      this.currentContext = {
        ...this.currentContext,
        lastReloadRequestTime: currentTime,
      };

      if (this.domNode) {
        this.render(this.domNode);
      }
    }
  }
}
