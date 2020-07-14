/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { shallow } from 'enzyme';
import { NoFieldsCallout } from './no_fields_callout';

describe('NoFieldCallout', () => {
  it('renders properly for index with no fields', () => {
    const component = shallow(
      <NoFieldsCallout existFieldsInIndex={false} isAffectedByFieldFilter={false} />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders properly when affected by field filters, global filter and timerange', () => {
    const component = shallow(
      <NoFieldsCallout
        existFieldsInIndex={true}
        isAffectedByFieldFilter={true}
        isAffectedByTimerange={true}
        isAffectedByGlobalFilter={true}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders properly when affected by field filter', () => {
    const component = shallow(
      <NoFieldsCallout existFieldsInIndex={true} isAffectedByFieldFilter={true} />
    );
    expect(component).toMatchSnapshot();
  });
});
