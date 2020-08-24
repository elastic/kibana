/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import {
  Filter,
  IIndexPattern,
  Query,
  TimefilterContract,
  TimeRange,
} from 'src/plugins/data/public';
import { ExecutionContextSearch } from 'src/plugins/expressions';

import { Subscription } from 'rxjs';
import {
  ExpressionRendererEvent,
  ReactExpressionRendererType,
} from '../../../../../../src/plugins/expressions/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../../src/plugins/visualizations/public';

import {
  Embeddable as AbstractEmbeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
} from '../../../../../../src/plugins/embeddable/public';
import { DOC_TYPE, Document, injectFilterReferences } from '../../persistence';
import { ExpressionWrapper } from './expression_wrapper';
import { UiActionsStart } from '../../../../../../src/plugins/ui_actions/public';
import { isLensBrushEvent, isLensFilterEvent } from '../../types';

export interface LensEmbeddableConfiguration {
  expression: string | null;
  savedVis: Document;
  editUrl: string;
  editPath: string;
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
  private getTrigger: UiActionsStart['getTrigger'] | undefined;
  private expression: string | null;
  private savedVis: Document;
  private domNode: HTMLElement | Element | undefined;
  private subscription: Subscription;
  private autoRefreshFetchSubscription: Subscription;

  private externalSearchContext: {
    timeRange?: TimeRange;
    query?: Query;
    filters?: Filter[];
    lastReloadRequestTime?: number;
  } = {};

  constructor(
    timefilter: TimefilterContract,
    expressionRenderer: ReactExpressionRendererType,
    getTrigger: UiActionsStart['getTrigger'] | undefined,
    {
      expression,
      savedVis,
      editPath,
      editUrl,
      editable,
      indexPatterns,
    }: LensEmbeddableConfiguration,
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
        editApp: 'lens',
        editPath,
        editUrl,
        indexPatterns,
      },
      parent
    );

    this.getTrigger = getTrigger;
    this.expressionRenderer = expressionRenderer;
    this.expression = expression;
    this.savedVis = savedVis;
    this.subscription = this.getInput$().subscribe((input) => this.onContainerStateChanged(input));
    this.onContainerStateChanged(initialInput);

    this.autoRefreshFetchSubscription = timefilter
      .getAutoRefreshFetch$()
      .subscribe(this.reload.bind(this));
  }

  public supportedTriggers() {
    switch (this.savedVis.visualizationType) {
      case 'lnsXY':
        return [VIS_EVENT_TO_TRIGGER.filter, VIS_EVENT_TO_TRIGGER.brush];
      case 'lnsDatatable':
      case 'lnsPie':
        return [VIS_EVENT_TO_TRIGGER.filter];
      case 'lnsMetric':
      default:
        return [];
    }
  }

  onContainerStateChanged(containerState: LensEmbeddableInput) {
    const cleanedFilters = containerState.filters
      ? containerState.filters.filter((filter) => !filter.meta.disabled)
      : undefined;
    if (
      !_.isEqual(containerState.timeRange, this.externalSearchContext.timeRange) ||
      !_.isEqual(containerState.query, this.externalSearchContext.query) ||
      !_.isEqual(cleanedFilters, this.externalSearchContext.filters)
    ) {
      this.externalSearchContext = {
        timeRange: containerState.timeRange,
        query: containerState.query,
        lastReloadRequestTime: this.externalSearchContext.lastReloadRequestTime,
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
        expression={this.expression}
        searchContext={this.getMergedSearchContext()}
        handleEvent={this.handleEvent}
      />,
      domNode
    );
  }

  /**
   * Combines the embeddable context with the saved object context, and replaces
   * any references to index patterns
   */
  private getMergedSearchContext(): ExecutionContextSearch {
    const output: ExecutionContextSearch = {
      timeRange: this.externalSearchContext.timeRange,
    };
    if (this.externalSearchContext.query) {
      output.query = [this.externalSearchContext.query, this.savedVis.state.query];
    } else {
      output.query = [this.savedVis.state.query];
    }
    if (this.externalSearchContext.filters?.length) {
      output.filters = [...this.externalSearchContext.filters, ...this.savedVis.state.filters];
    } else {
      output.filters = [...this.savedVis.state.filters];
    }

    output.filters = injectFilterReferences(output.filters, this.savedVis.references);
    return output;
  }

  handleEvent = (event: ExpressionRendererEvent) => {
    if (!this.getTrigger || this.input.disableTriggers) {
      return;
    }
    if (isLensBrushEvent(event)) {
      this.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
        data: event.data,
        embeddable: this,
      });
    }
    if (isLensFilterEvent(event)) {
      this.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
        data: event.data,
        embeddable: this,
      });
    }
  };

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
    if (this.externalSearchContext.lastReloadRequestTime !== currentTime) {
      this.externalSearchContext = {
        ...this.externalSearchContext,
        lastReloadRequestTime: currentTime,
      };

      if (this.domNode) {
        this.render(this.domNode);
      }
    }
  }
}
