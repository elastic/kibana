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
   * Yield the result of `mapper` over and over, once per event-loop cycle.
   * After 10 times, quit.
   * Use this to continually check a value. See `toYieldEqualTo`.
   */
  public async *map<R>(mapper: () => R): AsyncIterable<R> {
    let timeoutCount = 0;
    while (timeoutCount < 10) {
      timeoutCount++;
      yield mapper();
      await new Promise((resolve) => {
        setTimeout(() => {
          this.wrapper.update();
          resolve();
        }, 0);
      });
    }
  }

  /**
   * Find a process node element. Takes options supported by `resolverNodeSelector`.
   * returns a `ReactWrapper` even if nothing is found, as that is how `enzyme` does things.
   */
  public processNodeElements(options: ProcessNodeElementSelectorOptions = {}): ReactWrapper {
    return this.domNodes(processNodeElementSelector(options));
  }

  /**
   * Return the node element with the given `entityID`.
   */
  public selectedProcessNode(entityID: string): ReactWrapper {
    return this.processNodeElements({ entityID, selected: true });
  }

  /**
   * Return the node element with the given `entityID`. It will only be returned if it is not selected.
   */
  public unselectedProcessNode(entityID: string): ReactWrapper {
    return this.processNodeElements({ entityID }).not(
      processNodeElementSelector({ entityID, selected: true })
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
    return this.domNodes(
      `${processNodeElementSelector({ entityID })} [data-test-subj="resolver:submenu:button"]`
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
    return this.domNodes('[data-test-subj="resolver:graph:loading"]');
  }

  /**
   * The element that shows if Resolver couldn't draw the graph.
   */
  public graphErrorElement(): ReactWrapper {
    return this.domNodes('[data-test-subj="resolver:graph:error"]');
  }

  /**
   * The element where nodes get drawn.
   */
  public graphElement(): ReactWrapper {
    return this.domNodes('[data-test-subj="resolver:graph"]');
  }

  /**
   * An element with a list of all nodes.
   */
  public nodeListElement(): ReactWrapper {
    return this.domNodes('[data-test-subj="resolver:node-list"]');
  }

  /**
   * Return the items in the node list (the default panel view.)
   */
  public nodeListItems(): ReactWrapper {
    return this.domNodes('[data-test-subj="resolver:node-list:item"]');
  }

  /**
   * The element containing the details for the selected node.
   */
  public nodeDetailElement(): ReactWrapper {
    return this.domNodes('[data-test-subj="resolver:node-detail"]');
  }

  /**
   * The details of the selected node are shown in a description list. This returns the title elements of the description list.
   */
  private nodeDetailEntryTitle(): ReactWrapper {
    return this.domNodes('[data-test-subj="resolver:node-detail:entry-title"]');
  }

  /**
   * The details of the selected node are shown in a description list. This returns the description elements of the description list.
   */
  private nodeDetailEntryDescription(): ReactWrapper {
    return this.domNodes('[data-test-subj="resolver:node-detail:entry-description"]');
  }

  /**
   * Return DOM nodes that match `enzymeSelector`.
   */
  private domNodes(enzymeSelector: string): ReactWrapper {
    return this.wrapper
      .find(enzymeSelector)
      .filterWhere((wrapper) => typeof wrapper.type() === 'string');
  }

  /**
   * The titles and descriptions (as text) from the node detail panel.
   */
  public nodeDetailDescriptionListEntries(): Array<[string, string]> {
    const titles = this.nodeDetailEntryTitle();
    const descriptions = this.nodeDetailEntryDescription();
    const entries: Array<[string, string]> = [];
    for (let index = 0; index < Math.min(titles.length, descriptions.length); index++) {
      const title = titles.at(index).text();
      const description = descriptions.at(index).text();

      // Exclude timestamp since we can't currently calculate the expected description for it from tests
      if (title !== '@timestamp') {
        entries.push([title, description]);
      }
    }
    return entries;
  }

  /**
   * Resolve the wrapper returned by `wrapperFactory` only once it has at least 1 element in it.
   */
  public async resolveWrapper(
    wrapperFactory: () => ReactWrapper,
    predicate: (wrapper: ReactWrapper) => boolean = (wrapper) => wrapper.length > 0
  ): Promise<ReactWrapper | void> {
    for await (const wrapper of this.map(wrapperFactory)) {
      if (predicate(wrapper)) {
        return wrapper;
      }
    }
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
