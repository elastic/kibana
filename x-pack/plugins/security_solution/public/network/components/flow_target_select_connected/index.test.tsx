/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import '../../../common/mock/match_media';
import { TestProviders } from '../../../common/mock';
import { FlowTargetSelectConnectedComponent } from '.';
import { FlowTarget } from '../../../../common/search_strategy';

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
