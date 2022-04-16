/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { SchemaErrorsCallout } from '.';

describe('SchemaErrorsCallout', () => {
  it('renders', () => {
    const wrapper = shallow(<SchemaErrorsCallout viewErrorsPath="/reindex_job/someId" />);

    expect(wrapper.find('[data-test-subj="schemaErrorsCallout"]').prop('title')).toEqual(
      'There was an error during your schema reindex'
    );
    expect(wrapper.find('[data-test-subj="viewErrorsButton"]').prop('to')).toEqual(
      '/reindex_job/someId'
    );
  });
});
