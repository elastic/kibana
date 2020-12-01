/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { tryDecodeURIComponent } from './url_utils';

describe('tryDecodeURIComponent', () => {
  it('properly decodes a URI Component', () => {
    expect(
      tryDecodeURIComponent('sample%26piece%3Dof%20text%40gmail.com%2520')
    ).toMatchInlineSnapshot(`"sample&piece=of text@gmail.com%20"`);
  });

  it('returns the original string undecoded if it is malformed', () => {
    expect(tryDecodeURIComponent('sample&piece=of%text@gmail.com%20')).toMatchInlineSnapshot(
      `"sample&piece=of%text@gmail.com%20"`
    );
  });
});
