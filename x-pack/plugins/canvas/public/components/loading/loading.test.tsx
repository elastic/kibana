/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { Loading } from './loading';

describe('<Loading />', () => {
  it('uses EuiIcon by default', () => {
    expect(shallow(<Loading />)).toMatchInlineSnapshot(`
      <div
        className="canvasLoading"
      >
        <EuiIcon
          color="ghost"
          type="clock"
        />
      </div>
    `);
  });

  it('uses EuiLoadingSpinner when animating', () => {
    expect(shallow(<Loading animated />)).toMatchInlineSnapshot(`
      <div
        className="canvasLoading"
      >
        <EuiLoadingSpinner
          size="m"
        />
      </div>
    `);
  });
});
