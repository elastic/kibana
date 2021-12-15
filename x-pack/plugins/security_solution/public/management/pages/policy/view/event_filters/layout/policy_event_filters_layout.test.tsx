/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { PolicyEventFiltersLayout } from './policy_event_filters_layout';
import * as reactTestingLibrary from '@testing-library/react';
import {
  AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../../../common/mock/endpoint';
import { EndpointDocGenerator } from '../../../../../../../common/endpoint/generate_data';
import { EventFilterGenerator } from '../../../../../../../common/endpoint/data_generators/event_filter_generator';

import { EventFiltersHttpService } from '../../../../event_filters/service';
import { ImmutableObject, PolicyData } from '../../../../../../../common/endpoint/types';

jest.mock('../../../../event_filters/service');
const EventFiltersHttpServiceMock = EventFiltersHttpService as jest.Mock;

let render: () => ReturnType<AppContextTestRender['render']>;
let mockedContext: AppContextTestRender;
let policyItem: ImmutableObject<PolicyData>;
const generator = new EndpointDocGenerator();
const eventFilterGenerator = new EventFilterGenerator();

describe('Policy event filters layout', () => {
  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    policyItem = generator.generatePolicyPackagePolicy();
    render = () => mockedContext.render(<PolicyEventFiltersLayout policyItem={policyItem} />);
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should renders layout with a loader', async () => {
    const component = render();
    expect(component.getByTestId('policy-event-filters-loading-spinner')).toBeTruthy();
  });

  it('should renders layout with no assigned event filters data when there are not event filters', async () => {
    EventFiltersHttpServiceMock.mockImplementation(() => {
      return {
        getList: () => ({
          total: 0,
          data: [],
        }),
      };
    });

    const component = render();
    expect(await component.findByTestId('policy-event-filters-empty-unexisting')).not.toBeNull();
  });

  it('should renders layout with no assigned event filters data when there are event filters', async () => {
    EventFiltersHttpServiceMock.mockImplementation(() => {
      return {
        getList: (
          params: Partial<{
            filter: string;
          }>
        ) => {
          if (
            params &&
            params.filter ===
              `(exception-list-agnostic.attributes.tags:"policy:${policyItem.id}" OR exception-list-agnostic.attributes.tags:"policy:all")`
          ) {
            return {
              total: 0,
              data: [],
            };
          } else {
            return {
              total: 1,
              data: [eventFilterGenerator.generate()],
            };
          }
        },
      };
    });

    const component = render();

    expect(await component.findByTestId('policy-event-filters-empty-unassigned')).not.toBeNull();
  });

  it('should renders layout with data', async () => {
    EventFiltersHttpServiceMock.mockImplementation(() => {
      return {
        getList: () => ({
          total: 3,
          data: Array.from({ length: 3 }, () => eventFilterGenerator.generate()),
        }),
      };
    });
    const component = render();
    expect(await component.findByTestId('policy-event-filters-header-section')).not.toBeNull();
    expect(await component.findByTestId('policy-event-filters-layout-about')).not.toBeNull();
    expect((await component.findByTestId('policy-event-filters-layout-about')).textContent).toMatch(
      '3 event filters'
    );
  });
});
