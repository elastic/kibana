/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { setClipboardData, getClipboardData } from '../clipboard';
import { elements } from '../../../__tests__/fixtures/workpads';

describe('clipboard', () => {
  it('stores and retrieves clipboard data', () => {
    setClipboardData(elements);
    expect(getClipboardData()).to.eql(JSON.stringify(elements));
  });
});
