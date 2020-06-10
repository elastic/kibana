/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { TestProviders } from '../../../common/mock';
import { FlowTargetSelectConnectedComponent } from './index';
import { FlowTarget } from '../../../graphql/types';

describe('Flow Target Select Connected', () => {
  test('renders correctly against snapshot flowTarget source', () => {
    const wrapper = mount(
      <TestProviders>
        <MemoryRouter>
          <FlowTargetSelectConnectedComponent flowTarget={FlowTarget.source} />
        </MemoryRouter>
      </TestProviders>
    );
    expect(wrapper.find('Memo(FlowTargetSelectComponent)').prop('selectedTarget')).toEqual(
      FlowTarget.source
    );
  });

  test('renders correctly against snapshot flowTarget destination', () => {
    const wrapper = mount(
      <TestProviders>
        <MemoryRouter>
          <FlowTargetSelectConnectedComponent flowTarget={FlowTarget.destination} />
        </MemoryRouter>
      </TestProviders>
    );

    expect(wrapper.find('Memo(FlowTargetSelectComponent)').prop('selectedTarget')).toEqual(
      FlowTarget.destination
    );
  });
});
