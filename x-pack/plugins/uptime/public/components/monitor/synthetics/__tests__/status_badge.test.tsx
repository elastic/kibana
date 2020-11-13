/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallowWithIntl } from '@kbn/test/jest';
import React from 'react';
import { StatusBadge } from '../status_badge';

describe('StatusBadge', () => {
  it('displays success message', () => {
    expect(shallowWithIntl(<StatusBadge status="succeeded" />)).toMatchInlineSnapshot(`
      <EuiBadge
        color="#017d73"
      >
        Succeeded
      </EuiBadge>
    `);
  });

  it('displays failed message', () => {
    expect(shallowWithIntl(<StatusBadge status="failed" />)).toMatchInlineSnapshot(`
      <EuiBadge
        color="#bd271e"
      >
        Failed
      </EuiBadge>
    `);
  });

  it('displays skipped message', () => {
    expect(shallowWithIntl(<StatusBadge status="skipped" />)).toMatchInlineSnapshot(`
      <EuiBadge
        color="default"
      >
        Skipped
      </EuiBadge>
    `);
  });
});
