/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Store } from 'redux';
import { ReactWrapper } from 'enzyme';

export function connectEnzymeWrapperAndStore(store: Store<unknown>, wrapper: ReactWrapper): void {
  store.subscribe(() => {
    // update the enzyme wrapper after each state transition
    return wrapper.update();
  });
}
