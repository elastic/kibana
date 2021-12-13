/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';

import { docLinks } from '../../../../shared/doc_links';

import { SchemaAddFieldModal } from '../../../../shared/schema';

import { EmptyState } from './';

describe('EmptyState', () => {
  it('renders', () => {
    const wrapper = shallow(<EmptyState />)
      .find(EuiEmptyPrompt)
      .dive();

    expect(wrapper.find('h2').text()).toEqual('Create a schema');
    expect(wrapper.find(EuiButton).prop('href')).toEqual(
      expect.stringContaining(docLinks.appSearchIndexingDocsSchema)
    );
  });

  it('renders a modal that lets a user add a new schema field', () => {
    setMockValues({ isModalOpen: true });
    const wrapper = shallow(<EmptyState />);

    expect(wrapper.find(SchemaAddFieldModal)).toHaveLength(1);
  });
});
