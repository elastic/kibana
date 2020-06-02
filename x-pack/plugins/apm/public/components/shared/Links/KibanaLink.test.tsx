/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { getRenderedHref } from '../../../utils/testHelpers';
import { KibanaLink } from './KibanaLink';

describe('KibanaLink', () => {
  it('produces the correct URL', async () => {
    const href = await getRenderedHref(() => <KibanaLink path="/some/path" />, {
      search: '?rangeFrom=now-5h&rangeTo=now-2h',
    } as Location);
    expect(href).toMatchInlineSnapshot(`"/basepath/app/kibana#/some/path"`);
  });
});
