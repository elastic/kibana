/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, ShallowWrapper } from 'enzyme';
import 'jest-styled-components';
import React from 'react';
import { APMError } from 'x-pack/plugins/apm/typings/es_schemas/Error';
import { DiscoverErrorButton } from '../DiscoverErrorButton';

describe('DiscoverErrorButton without kuery', () => {
  let wrapper: ShallowWrapper;
  beforeEach(() => {
    const error = {
      context: { service: { name: 'myServiceName' } },
      error: { grouping_key: 'myGroupingKey' }
    } as APMError;

    wrapper = shallow(<DiscoverErrorButton error={error} />);
  });

  it('should have correct query', () => {
    const queryProp = wrapper.prop('query') as any;
    expect(queryProp._a.query.query).toEqual(
      'context.service.name:"myServiceName" AND error.grouping_key:"myGroupingKey"'
    );
  });

  it('should match snapshot', () => {
    expect(wrapper).toMatchSnapshot();
  });
});

describe('DiscoverErrorButton with kuery', () => {
  let wrapper: ShallowWrapper;
  beforeEach(() => {
    const error = {
      context: { service: { name: 'myServiceName' } },
      error: { grouping_key: 'myGroupingKey' }
    } as APMError;

    const kuery = 'transaction.sampled: true';

    wrapper = shallow(<DiscoverErrorButton error={error} kuery={kuery} />);
  });

  it('should have correct query', () => {
    const queryProp = wrapper.prop('query') as any;
    expect(queryProp._a.query.query).toEqual(
      'context.service.name:"myServiceName" AND error.grouping_key:"myGroupingKey" AND transaction.sampled: true'
    );
  });

  it('should match snapshot', () => {
    expect(wrapper).toMatchSnapshot();
  });
});
