/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getChunks, MiddleTruncatedText } from './middle_truncated_text';
import { shallowWithIntl } from '@kbn/test/jest';
import React from 'react';

const longString =
  'this-is-a-really-really-really-really-really-really-really-really-long-string.madeup.extension';

describe('getChunks', () => {
  it('Calculates chunks correctly', () => {
    const result = getChunks(longString);
    expect(result).toEqual({
      first: 'this-is-a-really-really-really-really-really-really-really-really-long-string.made',
      last: 'up.extension',
    });
  });
});

describe('Component', () => {
  it('Renders correctly', () => {
    expect(shallowWithIntl(<MiddleTruncatedText text={longString} />)).toMatchInlineSnapshot(`
      <styled.div>
        <styled.div>
          <styled.span>
            this-is-a-really-really-really-really-really-really-really-really-long-string.made
          </styled.span>
          <styled.span>
            up.extension
          </styled.span>
        </styled.div>
      </styled.div>
    `);
  });
});
