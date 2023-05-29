/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EMPTY_VALUE } from '../../../../constants/common';
import { TLPBadge } from './tlp_badge';

describe('TLPBadge', () => {
  it(`should return ${EMPTY_VALUE} if color doesn't exist`, () => {
    const invalidValue = 'abc';
    const { asFragment } = render(<TLPBadge value={invalidValue} />);
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        -
      </DocumentFragment>
    `);
  });

  it('should handle value in various casing with extra spaces', () => {
    const value = ' RED ';
    const { asFragment } = render(<TLPBadge value={value} />);
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <span
          class="euiBadge emotion-euiBadge"
          style="background-color: rgb(189, 39, 30); color: rgb(255, 255, 255);"
          title="Red"
        >
          <span
            class="euiBadge__content emotion-euiBadge__content"
          >
            <span
              class="euiBadge__text emotion-euiBadge__text"
            >
              Red
            </span>
          </span>
        </span>
      </DocumentFragment>
    `);
  });

  it('should handle proper value', () => {
    const value = 'green';
    const { asFragment } = render(<TLPBadge value={value} />);
    expect(asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <span
          class="euiBadge emotion-euiBadge"
          style="background-color: rgb(77, 210, 202); color: rgb(0, 0, 0);"
          title="Green"
        >
          <span
            class="euiBadge__content emotion-euiBadge__content"
          >
            <span
              class="euiBadge__text emotion-euiBadge__text"
            >
              Green
            </span>
          </span>
        </span>
      </DocumentFragment>
    `);
  });
});
