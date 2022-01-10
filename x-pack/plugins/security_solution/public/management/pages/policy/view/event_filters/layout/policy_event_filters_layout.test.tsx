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

import { ImmutableObject, PolicyData } from '../../../../../../../common/endpoint/types';
import { parsePoliciesAndFilterToKql } from '../../../../../common/utils';
import { eventFiltersListQueryHttpMock } from '../../../../event_filters/test_utils';
import { getFoundExceptionListItemSchemaMock } from '../../../../../../../../lists/common/schemas/response/found_exception_list_item_schema.mock';

let render: () => ReturnType<AppContextTestRender['render']>;
let mockedContext: AppContextTestRender;
let policyItem: ImmutableObject<PolicyData>;
const generator = new EndpointDocGenerator();
let mockedApi: ReturnType<typeof eventFiltersListQueryHttpMock>;

describe('Policy event filters layout', () => {
  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    mockedApi = eventFiltersListQueryHttpMock(mockedContext.coreStart.http);
    policyItem = generator.generatePolicyPackagePolicy();
    render = () => mockedContext.render(<PolicyEventFiltersLayout policyItem={policyItem} />);
  });

  afterEach(() => reactTestingLibrary.cleanup());

  it('should renders layout with a loader', async () => {
    const component = render();
    expect(component.getByTestId('policy-event-filters-loading-spinner')).toBeTruthy();
  });

  it('should renders layout with no assigned event filters data when there are not event filters', async () => {
    mockedApi.responseProvider.eventFiltersList.mockReturnValue(
      getFoundExceptionListItemSchemaMock(0)
    );

    const component = render();
    expect(await component.findByTestId('policy-event-filters-empty-unexisting')).not.toBeNull();
  });

  it('should renders layout with no assigned event filters data when there are event filters', async () => {
    mockedApi.responseProvider.eventFiltersList.mockImplementation(
      // @ts-expect-error
      (args) => {
        const params = args.query;
        if (
          params &&
          params.filter === parsePoliciesAndFilterToKql({ policies: [policyItem.id, 'all'] })
        ) {
          return getFoundExceptionListItemSchemaMock(0);
        } else {
          return getFoundExceptionListItemSchemaMock(1);
        }
      }
    );

    const component = render();

    expect(await component.findByTestId('policy-event-filters-empty-unassigned')).not.toBeNull();
  });

  it('should renders layout with data', async () => {
    mockedApi.responseProvider.eventFiltersList.mockReturnValue(
      getFoundExceptionListItemSchemaMock(3)
    );
    const component = render();
    expect(await component.findByTestId('policy-event-filters-header-section')).not.toBeNull();
    expect(await component.findByTestId('policy-event-filters-layout-about')).not.toBeNull();
    expect((await component.findByTestId('policy-event-filters-layout-about')).textContent).toMatch(
      '3 event filters'
    );
  });
});
