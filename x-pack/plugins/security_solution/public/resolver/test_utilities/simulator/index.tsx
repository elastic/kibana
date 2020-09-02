/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Store, createStore, applyMiddleware } from 'redux';
import { mount, ReactWrapper } from 'enzyme';
import { History as HistoryPackageHistoryInterface, createMemoryHistory } from 'history';
import { CoreStart } from '../../../../../../../src/core/public';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { spyMiddlewareFactory } from '../spy_middleware_factory';
import { resolverMiddlewareFactory } from '../../store/middleware';
import { resolverReducer } from '../../store/reducer';
import { MockResolver } from './mock_resolver';
import { ResolverState, DataAccessLayer, SpyMiddleware, SideEffectSimulator } from '../../types';
import { ResolverAction } from '../../store/actions';
import { sideEffectSimulatorFactory } from '../../view/side_effect_simulator_factory';

/**
 * Test a Resolver instance using jest, enzyme, and a mock data layer.
 */
export class Simulator {
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
  /**
   * Simulator which allows you to explicitly simulate resize events and trigger animation frames
   */
  private readonly sideEffectSimulator: SideEffectSimulator;

  constructor({
    dataAccessLayer,
    resolverComponentInstanceID,
    databaseDocumentID,
    history,
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
    history?: HistoryPackageHistoryInterface<never>;
  }) {
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

    // If needed, create a fake 'history' instance.
    // Resolver will use to read and write query string values.
    this.history = history ?? createMemoryHistory();

    // Used for `KibanaContextProvider`
    const coreStart: CoreStart = coreMock.createStart();

    this.sideEffectSimulator = sideEffectSimulatorFactory();

    // Render Resolver via the `MockResolver` component, using `enzyme`.
    this.wrapper = mount(
      <MockResolver
        resolverComponentInstanceID={resolverComponentInstanceID}
        history={this.history}
        sideEffectSimulator={this.sideEffectSimulator}
        store={this.store}
        coreStart={coreStart}
        databaseDocumentID={databaseDocumentID}
      />
    );
  }

  /**
   * Unmount the Resolver component. Use this to test what happens when code that uses Resolver unmounts it.
   */
  public unmount(): void {
    this.wrapper.unmount();
  }

  /**
   * Get the component instance ID from the component.
   */
  public get resolverComponentInstanceID(): string {
    return this.wrapper.prop('resolverComponentInstanceID');
  }

  /**
   * Change the component instance ID (updates the React component props.)
   */
  public set resolverComponentInstanceID(value: string) {
    this.wrapper.setProps({ resolverComponentInstanceID: value });
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
   * EUI uses a component called `AutoSizer` that won't render its children unless it has sufficient size.
   * This forces any `AutoSizer` instances to have a large size.
   */
  private forceAutoSizerOpen() {
    this.wrapper
      .find('AutoSizer')
      .forEach((wrapper) => wrapper.setState({ width: 10000, height: 10000 }));
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
          this.forceAutoSizerOpen();
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
   * The button that opens a node's submenu.
   */
  public processNodeSubmenuButton(
    /** nodeID for the related node */ entityID: string
  ): ReactWrapper {
    return this.domNodes(
      `[data-test-subj="resolver:submenu:button"][data-test-resolver-node-id="${entityID}"]`
    );
  }

  /**
   * The primary button (used to select a node) which contains a label for the node as its content.
   */
  public processNodePrimaryButton(
    /** nodeID for the related node */ entityID: string
  ): ReactWrapper {
    return this.domNodes(
      `[data-test-subj="resolver:node:primary-button"][data-test-resolver-node-id="${entityID}"]`
    );
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
   * This manually runs the animation frames tied to a configurable timestamp in the future.
   */
  public runAnimationFramesTimeFromNow(time: number = 0) {
    this.sideEffectSimulator.controls.time = time;
    this.sideEffectSimulator.controls.provideAnimationFrame();
  }

  /**
   * The 'search' part of the URL.
   */
  public get historyLocationSearch(): string {
    // Wrap the `search` value from the MemoryHistory using `URLSearchParams` in order to standardize it.
    return new URLSearchParams(this.history.location.search).toString();
  }

  /**
   * Given a 'data-test-subj' value, it will resolve the react wrapper or undefined if not found
   */
  public async resolve(selector: string): Promise<ReactWrapper | undefined> {
    return this.resolveWrapper(() => this.domNodes(`[data-test-subj="${selector}"]`));
  }

  /**
   * Given a 'data-test-subj' selector, it will return the domNode
   */
  public testSubject(selector: string): ReactWrapper {
    return this.domNodes(`[data-test-subj="${selector}"]`);
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
    /**
     * The details of the selected node are shown in a description list. This returns the title elements of the description list.
     */
    const titles = this.domNodes('[data-test-subj="resolver:node-detail:entry-title"]');
    /**
     * The details of the selected node are shown in a description list. This returns the description elements of the description list.
     */
    const descriptions = this.domNodes('[data-test-subj="resolver:node-detail:entry-description"]');
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
  ): Promise<ReactWrapper | undefined> {
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
