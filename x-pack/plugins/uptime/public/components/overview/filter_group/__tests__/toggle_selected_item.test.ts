/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toggleSelectedItems } from '../toggle_selected_item';

describe('toggleSelectedItems', () => {
  it(`adds the item if it's not in the list`, () => {
    const mock = jest.fn();
    toggleSelectedItems('abc', ['aba', 'abd'], mock);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(['aba', 'abd', 'abc']);
  });

  it(`removes the item if it's already in the list`, () => {
    const mock = jest.fn();
    toggleSelectedItems('abc', ['aba', 'abc', 'abd'], mock);
    expect(mock).toHaveBeenCalledTimes(1);
    expect(mock).toHaveBeenCalledWith(['aba', 'abd']);
  });
});
