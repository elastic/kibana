/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUserName } from './get_username';

describe('getUserName', () => {
  it('fetches the current username from the DOM', () => {
    document.body.innerHTML =
      '<div id="headerUserMenu">' +
      '  <span class="euiAvatar" aria-label="foo_bar_baz" />' +
      '</div>';

    expect(getUserName()).toEqual('foo_bar_baz');
  });

  it('returns null if the expected DOM does not exist', () => {
    document.body.innerHTML = '<div id="headerUserMenu">' + '<span class="euiAvatar" />' + '</div>';
    expect(getUserName()).toEqual(null);

    document.body.innerHTML = '<div id="headerUserMenu" />';
    expect(getUserName()).toEqual(null);

    document.body.innerHTML = '<div />';
    expect(getUserName()).toEqual(null);
  });
});
