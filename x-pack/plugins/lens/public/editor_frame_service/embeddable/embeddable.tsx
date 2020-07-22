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
  IndexPattern,
} from 'src/plugins/data/public';

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
  SavedObjectEmbeddableInput,
  AttributeService,
} from '../../../../../../src/plugins/embeddable/public';
import { DOC_TYPE, Document } from '../../persistence';
import { ExpressionWrapper } from './expression_wrapper';
import { UiActionsStart } from '../../../../../../src/plugins/ui_actions/public';
import { isLensBrushEvent, isLensFilterEvent } from '../../types';

import { IndexPatternsContract } from '../../../../../../src/plugins/data/public';
import { getEditPath } from '../../../common';
import { IBasePath } from '../../../../../../src/core/public';

export type LensSavedObjectAttributes = Omit<Document, 'id' | 'type'>;

export type LensEmbeddableInput = LensByValueInput | LensByReferenceInput;

export type LensByValueInput = { attributes: LensSavedObjectAttributes } & LensInheritedInput;
export type LensByReferenceInput = SavedObjectEmbeddableInput & LensInheritedInput;

export interface LensInheritedInput extends EmbeddableInput {
  timeRange?: TimeRange;
  query?: Query;
  filters?: Filter[];
}

export interface LensEmbeddableOutput extends EmbeddableOutput {
  indexPatterns?: IIndexPattern[];
}

export interface LensEmbeddableDeps {
  attributeService: AttributeService<
    LensSavedObjectAttributes,
    LensByValueInput,
    LensByReferenceInput
  >;
  editable: boolean;
  indexPatternService: IndexPatternsContract;
  expressionRenderer: ReactExpressionRendererType;
  timefilter: TimefilterContract;
  basePath: IBasePath;
  getTrigger?: UiActionsStart['getTrigger'] | undefined;
}

export class Embeddable extends AbstractEmbeddable<LensEmbeddableInput, LensEmbeddableOutput> {
  type = DOC_TYPE;

  private expressionRenderer: ReactExpressionRendererType;
  private savedVis: Document | undefined;
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
    private deps: LensEmbeddableDeps,
    initialInput: LensEmbeddableInput,
    parent?: IContainer
  ) {
    super(
      initialInput,
      {
        editApp: 'lens',
        editable: deps.editable,
      },
      parent
    );

    this.expressionRenderer = deps.expressionRenderer;
    this.initializeSavedVis(initialInput).then(() => this.onContainerStateChanged(initialInput));

    this.subscription = this.getInput$().subscribe((input) => {
      this.onContainerStateChanged(input);
    });

    this.autoRefreshFetchSubscription = deps.timefilter
      .getAutoRefreshFetch$()
      .subscribe(this.reload.bind(this));
  }

  public supportedTriggers() {
    if (!this.savedVis) {
      return [];
    }
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

  async initializeSavedVis(input: LensEmbeddableInput) {
    const attributes = await this.deps.attributeService.unwrapAttributes(input);
    this.savedVis = {
      ...attributes,
      type: this.type,
      savedObjectId: (input as LensByReferenceInput)?.savedObjectId,
    };
    this.initializeOutput();
    if (this.domNode) {
      this.render(this.domNode);
    }
  }

  onContainerStateChanged(containerState: LensEmbeddableInput) {
    const cleanedFilters = containerState.filters
      ? containerState.filters.filter((filter) => !filter.meta.disabled)
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

      this.reload();
    }
  }

  /**
   *
   * @param {HTMLElement} domNode
   * @param {ContainerState} containerState
   */
  render(domNode: HTMLElement | Element) {
    this.domNode = domNode;
    if (!this.savedVis) {
      return;
    }
    render(
      <ExpressionWrapper
        ExpressionRenderer={this.expressionRenderer}
        expression={this.savedVis.expression}
        context={this.currentContext}
        handleEvent={this.handleEvent}
      />,
      domNode
    );
  }

  handleEvent = (event: ExpressionRendererEvent) => {
    if (!this.deps.getTrigger || this.input.disableTriggers) {
      return;
    }
    if (isLensBrushEvent(event)) {
      this.deps.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
        data: event.data,
        embeddable: this,
      });
    }
    if (isLensFilterEvent(event)) {
      this.deps.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
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

  async reload() {
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

  async initializeOutput() {
    if (!this.savedVis) {
      return;
    }
    const promises = this.savedVis.state.datasourceMetaData.filterableIndexPatterns.map(
      async ({ id }) => {
        try {
          return await this.deps.indexPatternService.get(id);
        } catch (error) {
          // Unable to load index pattern, ignore error as the index patterns are only used to
          // configure the filter and query bar - there is still a good chance to get the visualization
          // to show.
          return null;
        }
      }
    );
    const indexPatterns = (
      await Promise.all(promises)
    ).filter((indexPattern: IndexPattern | null): indexPattern is IndexPattern =>
      Boolean(indexPattern)
    );
    // passing edit url and index patterns to the output of this embeddable for
    // the container to pick them up and use them to configure filter bar and
    // config dropdown correctly.
    const input = this.getInput();
    const title = input.hidePanelTitles
      ? ''
      : input.title === undefined
      ? this.savedVis.title
      : input.title;
    const savedObjectId = (input as LensByReferenceInput).savedObjectId;
    this.updateOutput({
      ...this.getOutput(),
      defaultTitle: this.savedVis.title,
      title,
      editPath: getEditPath(savedObjectId),
      editUrl: this.deps.basePath.prepend(`/app/lens${getEditPath(savedObjectId)}`),
      indexPatterns,
    });
  }
}
