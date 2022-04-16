/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable react/display-name */

import React, { useEffect, useState, useCallback } from 'react';
import { Router } from 'react-router-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { ResolverState, SideEffectSimulator, ResolverProps } from '../../types';
import { ResolverAction } from '../../store/actions';
import { ResolverWithoutProviders } from '../../view/resolver_without_providers';
import { SideEffectContext } from '../../view/side_effect_context';

type MockResolverProps = {
  /**
   * Used to simulate a raster width. Defaults to 1600.
   */
  rasterWidth?: number;
  /**
   * Used to simulate a raster height. Defaults to 1200.
   */
  rasterHeight?: number;
  /**
   * Used for the `KibanaContextProvider`
   */
  coreStart: CoreStart;
  /**
   * Used for `react-router`.
   */
  history: React.ComponentProps<typeof Router>['history'];
  /** Pass a resolver store. See `storeFactory` and `mockDataAccessLayer` */
  store: Store<ResolverState, ResolverAction>;
  /**
   * Pass the side effect simulator which handles animations and resizing. See `sideEffectSimulatorFactory`
   */
  sideEffectSimulator: SideEffectSimulator;
  /**
   * All the props from `ResolverWithoutStore` can be passed. These aren't defaulted to anything (you might want to test what happens when they aren't present.)
   */
} & ResolverProps;

/**
 * This is a mock Resolver component. It is intended to be used with `enzyme` tests via the `Simulator` class. It wraps Resolver in the required providers:
 *  * `i18n`
 *  * `Router` using a provided `History`
 *  * `SideEffectContext.Provider` using side effect simulator it creates
 *  * `KibanaContextProvider` using a provided `CoreStart` instance
 *  * `react-redux`'s `Provider` using a provided `Store`.
 *
 * Resolver needs to measure its size in the DOM. The `SideEffectSimulator` instance can fake the size of an element.
 * However in tests, React doesn't have good DOM reconciliation and the root element is often swapped out. When the
 * element is replaced, the fake dimensions stop being applied. In order to get around this issue, this component will
 * trigger a simulated resize on the root node reference any time it changes. This simulates the layout process a real
 * browser would do when an element is attached to the DOM.
 */
export const MockResolver = React.memo((props: MockResolverProps) => {
  const [resolverElement, setResolverElement] = useState<HTMLDivElement | null>(null);

  // Get a ref to the underlying Resolver element so we can resize.
  // Use a callback function because the underlying DOM node can change. In fact, `enzyme` seems to change it a lot.
  const resolverRef = useCallback((element: HTMLDivElement | null) => {
    setResolverElement(element);
  }, []);

  // Resize the Resolver element to match the passed in props. Resolver is size dependent.
  useEffect(() => {
    if (resolverElement) {
      const size: DOMRect = {
        width: props.rasterWidth ?? 1600,
        height: props.rasterHeight ?? 1200,
        x: 0,
        y: 0,
        bottom: 0,
        left: 0,
        top: 0,
        right: 0,
        toJSON() {
          return this;
        },
      };
      props.sideEffectSimulator.controls.simulateElementResize(resolverElement, size);
    }
  }, [props.rasterWidth, props.rasterHeight, props.sideEffectSimulator.controls, resolverElement]);

  return (
    <I18nProvider>
      <Router history={props.history}>
        <KibanaContextProvider services={props.coreStart}>
          <SideEffectContext.Provider value={props.sideEffectSimulator.mock}>
            <Provider store={props.store}>
              <ResolverWithoutProviders
                ref={resolverRef}
                databaseDocumentID={props.databaseDocumentID}
                resolverComponentInstanceID={props.resolverComponentInstanceID}
                indices={props.indices}
                shouldUpdate={props.shouldUpdate}
                filters={props.filters}
              />
            </Provider>
          </SideEffectContext.Provider>
        </KibanaContextProvider>
      </Router>
    </I18nProvider>
  );
});
