/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { renderWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { DownNoExpressionSelect } from '../down_number_select';

describe('DownNoExpressionSelect component', () => {
  const filters =
    '"{"bool":{"filter":[{"bool":{"should":[{"match":{"observer.geo.name":"US-West"}}],"minimum_should_match":1}},' +
    '{"bool":{"should":[{"match":{"url.port":443}}],"minimum_should_match":1}}]}}"';

  it('should shallow renders against props', function () {
    const component = shallowWithIntl(
      <DownNoExpressionSelect filters={filters} setAlertParams={jest.fn()} />
    );
    expect(component).toMatchSnapshot();
  });

  it('should renders against props', function () {
    const component = renderWithIntl(
      <DownNoExpressionSelect filters={filters} setAlertParams={jest.fn()} />
    );
    expect(component).toMatchSnapshot();
  });
});
