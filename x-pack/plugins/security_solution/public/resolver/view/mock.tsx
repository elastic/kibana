/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO, this is really part of the simulator. move it

/* eslint-disable no-duplicate-imports */

/* eslint-disable react/display-name */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { I18nProvider } from '@kbn/i18n/react';
import { Provider } from 'react-redux';
import { Store } from 'redux';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { CoreStart } from '../../../../../../src/core/public';
import { ResolverState, SideEffectSimulator, ResolverProps } from '../types';
import { ResolverAction } from '../store/actions';
import { ResolverWithoutProviders } from './resolver_without_providers';
import { SideEffectContext } from './side_effect_context';
import { sideEffectSimulator } from './side_effect_simulator';

type MockResolverProps = {
  // core start and history can be optionally passed
  coreStart?: CoreStart;
  history?: React.ComponentProps<typeof Router>['history'];
  // If passed, set the raster width to this value. Defaults to 800
  rasterWidth?: number;
  // If passed, set the raster height to this value. Defaults to 800
  rasterHeight?: number;
  /** Pass a resolver store. See `storeFactory` and `mockDataAccessLayer` */
  store: Store<ResolverState, ResolverAction>;
  // All the props from `ResolverWithoutStore` can be optionally passed.
} & Partial<ResolverProps>;

/**
 * This is a mock Resolver component. It has faked versions of various services:
 *  * fake i18n
 *  * fake (memory) history (optionally provided)
 *  * fake coreStart services (optionally provided)
 *  * SideEffectContext
 *
 *  You will need to provide a store. Create one with `storyFactory`. The store will need a mock `DataAccessLayer`.
 *
 *  Props required by `ResolverWithoutStore` can be passed as well. If not passed, they are defaulted.
 *  * `databaseDocumentID`
 *  * `resolverComponentInstanceID`
 *
 *  Use this in jest tests. Render it w/ `@testing-library/react` or `enzyme`. Then either interact with the result using fake events, or dispatch actions to the store. You could also pass in a store with initial data.
 */
export const MockResolver = React.memo((props: MockResolverProps) => {
  // Get the coreStart services from props, or create them if needed.
  const coreStart: CoreStart = useMemo(() => props.coreStart ?? coreMock.createStart(), [
    props.coreStart,
  ]);

  // Get the history object from props, or create it if needed.
  const history = useMemo(() => props.history ?? createMemoryHistory(), [props.history]);

  const [resolverElement, setResolverElement] = useState<HTMLDivElement | null>(null);

  // Get a ref to the underlying Resolver element so we can resize.
  // Use a callback function because the underlying DOM node can change. In fact, `enzyme` seems to change it a lot.
  const resolverRef = useCallback((element: HTMLDivElement | null) => {
    setResolverElement(element);
  }, []);

  const simulator: SideEffectSimulator = useMemo(() => sideEffectSimulator(), []);

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
      simulator.controls.simulateElementResize(resolverElement, size);
    }
  }, [props.rasterWidth, props.rasterHeight, simulator.controls, resolverElement]);

  return (
    <I18nProvider>
      <Router history={history}>
        <KibanaContextProvider services={coreStart}>
          <SideEffectContext.Provider value={simulator.mock}>
            <Provider store={props.store}>
              <ResolverWithoutProviders
                ref={resolverRef}
                databaseDocumentID={props.databaseDocumentID ?? 'id'}
                resolverComponentInstanceID={props.resolverComponentInstanceID ?? 'instanceID'}
              />
            </Provider>
          </SideEffectContext.Provider>
        </KibanaContextProvider>
      </Router>
    </I18nProvider>
  );
});
