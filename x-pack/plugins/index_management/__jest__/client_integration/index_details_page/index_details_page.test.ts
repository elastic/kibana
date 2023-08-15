/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupEnvironment } from '../helpers';
import { IndexDetailsPageTestBed, setup } from './index_details_page.helpers';
import { act } from 'react-dom/test-utils';
import { httpServiceMock } from '@kbn/core/public/mocks';
import { IndexDetailsSection } from '../../../public/application/sections/home/index_list/details_page';

describe('<IndexDetailsPage />', () => {
  let testBed: IndexDetailsPageTestBed;
  let httpSetup: ReturnType<typeof setupEnvironment>['httpSetup'];

  beforeEach(async () => {
    httpSetup = httpServiceMock.createSetupContract();

    await act(async () => {
      testBed = await setup(httpSetup);
    });
    testBed.component.update();
  });

  it('displays index name in the header', () => {
    const header = testBed.actions.getHeader();
    // test_index is configured in initialEntries of the memory router
    expect(header).toEqual('test_index');
  });

  it('defaults to overview tab', () => {
    const tabContent = testBed.actions.getActiveTabContent();
    expect(tabContent).toEqual('Overview');
  });

  it('documents tab', async () => {
    await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Documents);
    const tabContent = testBed.actions.getActiveTabContent();
    expect(tabContent).toEqual('Documents');
  });

  it('mappings tab', async () => {
    await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Mappings);
    const tabContent = testBed.actions.getActiveTabContent();
    expect(tabContent).toEqual('Mappings');
  });

  it('settings tab', async () => {
    await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Settings);
    const tabContent = testBed.actions.getActiveTabContent();
    expect(tabContent).toEqual('Settings');
  });

  it('pipelines tab', async () => {
    await testBed.actions.clickIndexDetailsTab(IndexDetailsSection.Pipelines);
    const tabContent = testBed.actions.getActiveTabContent();
    expect(tabContent).toEqual('Pipelines');
  });
});
