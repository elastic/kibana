/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Store, createStore, applyMiddleware } from 'redux';
import { mount, ReactWrapper } from 'enzyme';
import { createMemoryHistory, History as HistoryPackageHistoryInterface } from 'history';
import { CoreStart } from '../../../../../../../src/core/public';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { connectEnzymeWrapperAndStore } from '../connect_enzyme_wrapper_and_store';
import { spyMiddlewareFactory } from '../spy_middleware_factory';
import { resolverMiddlewareFactory } from '../../store/middleware';
import { resolverReducer } from '../../store/reducer';
import { MockResolver } from './mock_resolver';
import { ResolverState, DataAccessLayer, SpyMiddleware } from '../../types';
import { ResolverAction } from '../../store/actions';

/**
 * Test a Resolver instance using jest, enzyme, and a mock data layer.
 */
export class Simulator {
  /**
   * A string that uniquely identifies this Resolver instance among others mounted in the DOM.
   */
  private readonly resolverComponentInstanceID: string;
  /**
   * The redux store, creating in the constructor using the `dataAccessLayer`.
   * This code subscribes to state transitions.
   */
  private readonly store: Store<ResolverState, ResolverAction>;
  /**
   * A fake 'History' API used with `react-router` to simulate a browser history.
   */
  private readonly history: HistoryPackageHistoryInterface;
  /**
   * The 'wrapper' returned by `enzyme` that contains the rendered Resolver react code.
   */
  private readonly wrapper: ReactWrapper;
  /**
   * A `redux` middleware that exposes all actions dispatched (along with the state at that point.)
   * This is used by `debugActions`.
   */
  private readonly spyMiddleware: SpyMiddleware;
  constructor({
    dataAccessLayer,
    resolverComponentInstanceID,
    databaseDocumentID,
  }: {
    /**
     * A (mock) data access layer that will be used to create the Resolver store.
     */
    dataAccessLayer: DataAccessLayer;
    /**
     * A string that uniquely identifies this Resolver instance among others mounted in the DOM.
     */
    resolverComponentInstanceID: string;
    /**
     * a databaseDocumentID to pass to Resolver. Resolver will use this in requests to the mock data layer.
     */
    databaseDocumentID?: string;
  }) {
    this.resolverComponentInstanceID = resolverComponentInstanceID;
    // create the spy middleware (for debugging tests)
    this.spyMiddleware = spyMiddlewareFactory();

    /**
     * Create the real resolver middleware with a fake data access layer.
     * By providing different data access layers, you can simulate different data and server environments.
     */
    const middlewareEnhancer = applyMiddleware(
      resolverMiddlewareFactory(dataAccessLayer),
      // install the spyMiddleware
      this.spyMiddleware.middleware
    );

    // Create a redux store w/ the top level Resolver reducer and the enhancer that includes the Resolver middleware and the `spyMiddleware`
    this.store = createStore(resolverReducer, middlewareEnhancer);

    // Create a fake 'history' instance that Resolver will use to read and write query string values
    this.history = createMemoryHistory();

    // Used for `KibanaContextProvider`
    const coreStart: CoreStart = coreMock.createStart();

    // Render Resolver via the `MockResolver` component, using `enzyme`.
    this.wrapper = mount(
      <MockResolver
        resolverComponentInstanceID={this.resolverComponentInstanceID}
        history={this.history}
        store={this.store}
        coreStart={coreStart}
        databaseDocumentID={databaseDocumentID}
      />
    );

    // Update the enzyme wrapper after each state transition
    connectEnzymeWrapperAndStore(this.store, this.wrapper);
  }

  /**
   * Call this to console.log actions (and state). Use this to debug your tests.
   * State and actions aren't exposed otherwise because the tests using this simulator should
   * assert stuff about the DOM instead of internal state. Use selector/middleware/reducer
   * unit tests to test that stuff.
   */
  public debugActions(): /**
   * Optionally call this to stop debugging actions.
   */ () => void {
    return this.spyMiddleware.debugActions();
  }

  /**
   * Return a promise that resolves after the `store`'s next state transition.
   * Used by `mapStateTransitions`
   */
  private stateTransitioned(): Promise<void> {
    // keep track of the resolve function of the promise that has been returned.
    let resolveState: (() => void) | null = null;

    const promise: Promise<undefined> = new Promise((resolve) => {
      // Immediately expose the resolve function in the outer scope. It will be resolved when the next state transition occurs.
      resolveState = resolve;
    });

    // Subscribe to the store
    const unsubscribe = this.store.subscribe(() => {
      // Once a state transition occurs, unsubscribe.
      unsubscribe();
      // Resolve the promise. The null assertion is safe here as Promise initializers run immediately (according to spec and node/browser implementations.)
      // NB: the state is not resolved here. Code using the simulator should not rely on state or selectors of state.
      resolveState!();
    });

    // Return the promise that will be resolved on the next state transition, allowing code to `await` for the next state transition.
    return promise;
  }

  /**
   * This will yield the return value of `mapper` after each state transition. If no state transition occurs for 10 event loops in a row, this will give up.
   */
  public async *mapStateTransitions<R>(mapper: () => R): AsyncIterable<R> {
    // Yield the value before any state transitions have occurred.
    yield mapper();

    /** Increment this each time an event loop completes without a state transition.
     * If this value hits `10`, end the loop.
     *
     * Code will test assertions after each state transition. If the assertion hasn't passed and no further state transitions occur,
     * then the jest timeout will happen. The timeout doesn't give a useful message about the assertion.
     * By short-circuiting this function, code that uses it can short circuit the test timeout and print a useful error message.
     *
     * NB: the logic to short-circuit the loop is here because knowledge of state is a concern of the simulator, not tests.
     */
    let timeoutCount = 0;
    while (true) {
      /**
       * `await` a race between the next state transition and a timeout that happens after `0`ms.
       * If the timeout wins, no `dispatch` call caused a state transition in the last loop.
       * If this keeps happening, assume that Resolver isn't going to do anything else.
       *
       * If Resolver adds intentional delay logic (e.g. waiting before making a request), this code might have to change.
       * In that case, Resolver should use the side effect context to schedule future work. This code could then subscribe to some event published by the side effect context. That way, this code will be aware of Resolver's intention to do work.
       */
      const timedOut: boolean = await Promise.race([
        (async (): Promise<false> => {
          await this.stateTransitioned();
          // If a state transition occurs, return false for `timedOut`
          return false;
        })(),
        new Promise<true>((resolve) => {
          setTimeout(() => {
            // If a timeout occurs, resolve `timedOut` as true
            return resolve(true);
          }, 0);
        }),
      ]);

      if (timedOut) {
        // If a timout occurred, note it.
        timeoutCount++;
        if (timeoutCount === 10) {
          // if 10 timeouts happen in a row, end the loop early
          return;
        }
      } else {
        // If a state transition occurs, reset the timeout count and yield the value
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
   * true if a process node element is found for the entityID and if it *does not have* an [aria-selected] attribute.
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
   * Dump all contents of the outer ReactWrapper (to be `console.log`ged as appropriate)
   * This will include both DOM (div, span, etc.) and React/JSX (MyComponent, MyGrid, etc.)
   */
  public debugWrapper() {
    return this.wrapper.debug();
  }

  /**
   * Return an Enzyme ReactWrapper that includes the Related Events host button for a given process node
   *
   * @param entityID The entity ID of the proocess node to select in
   */
  public processNodeRelatedEventButton(entityID: string): ReactWrapper {
    return this.processNodeElements({ entityID }).findWhere(
      (wrapper) =>
        // Filter out React components
        typeof wrapper.type() === 'string' &&
        wrapper.prop('data-test-subj') === 'resolver:submenu:button'
    );
  }

  /**
   * Return the selected node query string values.
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
   * The outer panel container.
   */
  public panelElement(): ReactWrapper {
    return this.findInDOM('[data-test-subj="resolver:panel"]');
  }

  /**
   * The panel content element (which may include tables, lists, other data depending on the view).
   */
  public panelContentElement(): ReactWrapper {
    return this.findInDOM('[data-test-subj^="resolver:panel:"]');
  }

  /**
   * Like `this.wrapper.find` but only returns DOM nodes.
   */
  private findInDOM(selector: string): ReactWrapper {
    return this.wrapper.find(selector).filterWhere((wrapper) => typeof wrapper.type() === 'string');
  }
}

const baseResolverSelector = '[data-test-subj="resolver:node"]';

interface ProcessNodeElementSelectorOptions {
  /**
   * Entity ID of the node. If passed, will be used to create an data-attribute CSS selector that should only get the related node element.
   */
  entityID?: string;
  /**
   * If true, only get nodes with an `[aria-selected="true"]` attribute.
   */
  selected?: boolean;
}

/**
 * An `enzyme` supported CSS selector for process node elements.
 */
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
