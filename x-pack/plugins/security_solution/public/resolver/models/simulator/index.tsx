/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Store, createStore, applyMiddleware } from 'redux';
import { mount, ReactWrapper } from 'enzyme';
import { createMemoryHistory, History as HistoryPackageHistoryInterface } from 'history';
import { connectEnzymeWrapperAndStore } from '../../test_utilities/connect_enzyme_wrapper_and_store';
import { spyMiddlewareFactory } from '../../test_utilities/spy_middleware';
import { resolverMiddlewareFactory } from '../../store/middleware';
import { resolverReducer } from '../../store/reducer';
import { MockResolver } from '../../view/mock';
import { ResolverState, DataAccessLayer, SpyMiddleware } from '../../types';
import { ResolverAction } from '../../store/actions';

export class Simulator {
  private readonly store: Store<ResolverState, ResolverAction>;
  private readonly history: HistoryPackageHistoryInterface;
  private readonly wrapper: ReactWrapper;
  private readonly spyMiddleware: SpyMiddleware;
  constructor(
    dataAccessLayer: DataAccessLayer,
    private readonly resolverComponentInstanceID: string
  ) {
    this.spyMiddleware = spyMiddlewareFactory();

    const middlewareEnhancer = applyMiddleware(
      resolverMiddlewareFactory(dataAccessLayer),
      this.spyMiddleware.middleware
    );

    this.store = createStore(resolverReducer, middlewareEnhancer);

    this.history = createMemoryHistory();

    // Render Resolver via the `MockResolver` component, using `enzyme`.
    this.wrapper = mount(
      <MockResolver
        resolverComponentInstanceID={this.resolverComponentInstanceID}
        history={this.history}
        store={this.store}
      />
    );

    // Update the enzyme wrapper after each state transition
    connectEnzymeWrapperAndStore(this.store, this.wrapper);
  }

  public debugActions(): () => void {
    return this.spyMiddleware.debugActions();
  }

  /**
   * Return a promise that resolves after the `store`'s next state transition.
   */
  public stateTransitioned(): Promise<void> {
    let resolveState: (() => void) | null = null;
    const promise: Promise<undefined> = new Promise((resolve) => {
      resolveState = resolve;
    });
    const unsubscribe = this.store.subscribe(() => {
      unsubscribe();
      resolveState!();
    });
    return promise;
  }

  /**
   * This will yield the return value of `mapper` after each state transition. If no state transition occurs for 10 event loops in a row, this will give up.
   */
  public async *mapStateTransisions<R>(mapper: () => R): AsyncIterable<R> {
    yield mapper();
    let timeoutCount = 0;
    while (true) {
      const maybeValue: { value: R; timedOut: false } | { timedOut: true } = await Promise.race([
        (async (): Promise<{ value: R; timedOut: false }> => {
          await this.stateTransitioned();
          return {
            value: mapper(),
            timedOut: false,
          };
        })(),
        new Promise<{ timedOut: true }>((resolve) => {
          setTimeout(() => {
            return resolve({ timedOut: true });
          }, 0);
        }),
      ]);
      if (maybeValue.timedOut) {
        timeoutCount++;
        if (timeoutCount === 10) {
          return;
        }
      } else {
        timeoutCount = 0;
        yield mapper();
      }
    }
  }

  /**
   * Find a process node element. Takes options supported by `resolverNodeSelector`.
   * returns a `ReactWrapper` even if nothing is found, as that is how `enzyme` does things.
   */
  public processNodeElements(options: ProcessNodeElementSelectorOptions = {}): ReactWrapper {
    return this.findInDOM(processNodeElementSelector(options));
  }

  /**
   * true if a process node element is found for the entityID and if it has an [aria-selected] attribute.
   */
  public processNodeElementLooksSelected(entityID: string): boolean {
    return this.processNodeElements({ entityID, selected: true }).length === 1;
  }

  /**
   * true if a process node element is found for the entityID and if it has an [aria-selected] attribute.
   */
  public processNodeElementLooksUnselected(entityID: string): boolean {
    //  find the process node, then exclude it if its selected.
    return (
      this.processNodeElements({ entityID }).not(
        processNodeElementSelector({ entityID, selected: true })
      ).length === 1
    );
  }

  /**
   * Given a `History` and a `resolverDocumentID`, return any values stored in the query string.
   * This isn't exactly the same as the query string state, because parsing that from the query string
   * would be business logic. For example, this doesn't ignore duplicates.
   * Use this for testing.
   */
  public queryStringValues(): { selectedNode: string[] } {
    const urlSearchParams = new URLSearchParams(this.history.location.search);
    return {
      selectedNode: urlSearchParams.getAll(`resolver-${this.resolverComponentInstanceID}-id`),
    };
  }

  /**
   * The element that shows when Resolver is waiting for the graph data.
   */
  public graphLoadingElement(): ReactWrapper {
    return this.findInDOM('[data-test-subj="resolver:graph:loading"]');
  }

  /**
   * The element that shows if Resolver couldn't draw the graph.
   */
  public graphErrorElement(): ReactWrapper {
    return this.findInDOM('[data-test-subj="resolver:graph:error"]');
  }

  /**
   * The element where nodes get drawn.
   */
  public graphElement(): ReactWrapper {
    return this.findInDOM('[data-test-subj="resolver:graph"]');
  }

  /**
   * Like `this.wrapper.find` but only returns DOM nodes.
   */
  public findInDOM(selector: string): ReactWrapper {
    return this.wrapper.find(selector).filterWhere((wrapper) => typeof wrapper.type() === 'string');
  }
}

const baseResolverSelector = '[data-test-subj="resolver:node"]';

interface ProcessNodeElementSelectorOptions {
  entityID?: string;
  selected?: boolean;
}

function processNodeElementSelector({
  entityID,
  selected = false,
}: ProcessNodeElementSelectorOptions = {}): string {
  let selector: string = baseResolverSelector;
  if (entityID !== undefined) {
    selector += `[data-test-resolver-node-id="${entityID}"]`;
  }
  if (selected) {
    selector += '[aria-selected="true"]';
  }
  return selector;
}
