/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import { ReactWrapper } from 'enzyme';

/**
 * We use the full-DOM emulation mode of `enzyme` via `mount`. Even though we use `react-redux`, `enzyme`
 * does not update the DOM after state transitions. This subscribes to the `redux` store and after any state
 * transition it asks `enzyme` to update the DOM to match the React state.
 */
export function connectEnzymeWrapperAndStore(store: Store<unknown>, wrapper: ReactWrapper): void {
  store.subscribe(() => {
    // See https://enzymejs.github.io/enzyme/docs/api/ReactWrapper/update.html
    return wrapper.update();
  });
}
