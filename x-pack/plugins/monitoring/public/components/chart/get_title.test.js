/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getTitle } from './get_title';

describe('getTitle', function () {
  it('with metric.title', () => {
    const series = [
      { metric: { title: 'Foo', label: 'Bar X' } },
      { metric: { title: 'Foo', label: 'Bar Y' } },
    ];
    expect(getTitle(series)).to.be('Foo');
  });

  it('with metric.label', () => {
    const series = [
      { metric: { label: 'Bar A' } },
      { metric: { label: 'Bar B' } },
      { metric: { label: 'Bar B' } },
    ];
    expect(getTitle(series)).to.be('Bar A');
  });
});
