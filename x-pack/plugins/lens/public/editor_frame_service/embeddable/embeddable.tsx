/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import {
  ExecutionContextSearch,
  Filter,
  IIndexPattern,
  Query,
  TimefilterContract,
  TimeRange,
  IndexPattern,
} from 'src/plugins/data/public';
import { PaletteOutput } from 'src/plugins/charts/public';

import { Subscription } from 'rxjs';
import { toExpression, Ast } from '@kbn/interpreter/common';
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
  ReferenceOrValueEmbeddable,
} from '../../../../../../src/plugins/embeddable/public';
import { Document, injectFilterReferences } from '../../persistence';
import { ExpressionWrapper } from './expression_wrapper';
import { UiActionsStart } from '../../../../../../src/plugins/ui_actions/public';
import { isLensBrushEvent, isLensFilterEvent } from '../../types';

import { IndexPatternsContract } from '../../../../../../src/plugins/data/public';
import { getEditPath, DOC_TYPE } from '../../../common';
import { IBasePath } from '../../../../../../src/core/public';
import { LensAttributeService } from '../../lens_attribute_service';

export type LensSavedObjectAttributes = Omit<Document, 'savedObjectId' | 'type'>;

export type LensByValueInput = {
  attributes: LensSavedObjectAttributes;
} & EmbeddableInput;

export type LensByReferenceInput = SavedObjectEmbeddableInput & EmbeddableInput;
export type LensEmbeddableInput = (LensByValueInput | LensByReferenceInput) & {
  palette?: PaletteOutput;
};

export interface LensEmbeddableOutput extends EmbeddableOutput {
  indexPatterns?: IIndexPattern[];
}

export interface LensEmbeddableDeps {
  attributeService: LensAttributeService;
  documentToExpression: (doc: Document) => Promise<Ast | null>;
  editable: boolean;
  indexPatternService: IndexPatternsContract;
  expressionRenderer: ReactExpressionRendererType;
  timefilter: TimefilterContract;
  basePath: IBasePath;
  getTrigger?: UiActionsStart['getTrigger'] | undefined;
}

export class Embeddable
  extends AbstractEmbeddable<LensEmbeddableInput, LensEmbeddableOutput>
  implements ReferenceOrValueEmbeddable<LensByValueInput, LensByReferenceInput> {
  type = DOC_TYPE;

  private expressionRenderer: ReactExpressionRendererType;
  private savedVis: Document | undefined;
  private expression: string | undefined | null;
  private domNode: HTMLElement | Element | undefined;
  private subscription: Subscription;
  private autoRefreshFetchSubscription: Subscription;
  private isInitialized = false;

  private externalSearchContext: {
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
    this.subscription = this.getInput$().subscribe((input) => this.onContainerStateChanged(input));

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
    const attributes:
      | LensSavedObjectAttributes
      | false = await this.deps.attributeService.unwrapAttributes(input).catch((e: Error) => {
      this.onFatalError(e);
      return false;
    });
    if (!attributes) {
      return;
    }
    this.savedVis = {
      ...attributes,
      type: this.type,
      savedObjectId: (input as LensByReferenceInput)?.savedObjectId,
    };
    const expression = await this.deps.documentToExpression(this.savedVis);
    this.expression = expression ? toExpression(expression) : null;
    await this.initializeOutput();
    this.isInitialized = true;
    if (this.domNode) {
      this.render(this.domNode);
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
    if (!this.savedVis || !this.isInitialized) {
      return;
    }
    const input = this.getInput();
    render(
      <ExpressionWrapper
        ExpressionRenderer={this.expressionRenderer}
        expression={this.expression || null}
        searchContext={this.getMergedSearchContext()}
        variables={input.palette ? { theme: { palette: input.palette } } : {}}
        searchSessionId={this.input.searchSessionId}
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
    if (!this.savedVis) {
      throw new Error('savedVis is required for getMergedSearchContext');
    }
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

  async reload() {
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

  async initializeOutput() {
    if (!this.savedVis) {
      return;
    }
    const promises = _.uniqBy(
      this.savedVis.references.filter(({ type }) => type === 'index-pattern'),
      'id'
    )
      .map(async ({ id }) => {
        try {
          return await this.deps.indexPatternService.get(id);
        } catch (error) {
          // Unable to load index pattern, ignore error as the index patterns are only used to
          // configure the filter and query bar - there is still a good chance to get the visualization
          // to show.
          return null;
        }
      })
      .filter((promise): promise is Promise<IndexPattern> => Boolean(promise));
    const indexPatterns = await Promise.all(promises);
    // passing edit url and index patterns to the output of this embeddable for
    // the container to pick them up and use them to configure filter bar and
    // config dropdown correctly.
    const input = this.getInput();
    const title = input.hidePanelTitles ? '' : input.title || this.savedVis.title;
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

  public inputIsRefType = (
    input: LensByValueInput | LensByReferenceInput
  ): input is LensByReferenceInput => {
    return this.deps.attributeService.inputIsRefType(input);
  };

  public getInputAsRefType = async (): Promise<LensByReferenceInput> => {
    const input = this.deps.attributeService.getExplicitInputFromEmbeddable(this);
    return this.deps.attributeService.getInputAsRefType(input, {
      showSaveModal: true,
      saveModalTitle: this.getTitle(),
    });
  };

  public getInputAsValueType = async (): Promise<LensByValueInput> => {
    const input = this.deps.attributeService.getExplicitInputFromEmbeddable(this);
    return this.deps.attributeService.getInputAsValueType(input);
  };

  // same API as Visualize
  public getDescription() {
    // mind that savedViz is loaded in async way here
    return this.savedVis && this.savedVis.description;
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
}
