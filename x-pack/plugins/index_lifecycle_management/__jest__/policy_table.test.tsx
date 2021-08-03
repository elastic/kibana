/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import React, { ReactElement } from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl } from '@kbn/test/jest';
import { findTestSubject, takeMountedSnapshot } from '@elastic/eui/lib/test';

import {
  fatalErrorsServiceMock,
  injectedMetadataServiceMock,
} from '../../../../src/core/public/mocks';
import { HttpService } from '../../../../src/core/public/http';
import { usageCollectionPluginMock } from '../../../../src/plugins/usage_collection/public/mocks';

import { PolicyFromES } from '../common/types';
import { PolicyTable } from '../public/application/sections/policy_table/policy_table';
import { init as initHttp } from '../public/application/services/http';
import { init as initUiMetric } from '../public/application/services/ui_metric';
import { KibanaContextProvider } from '../public/shared_imports';
import { PolicyListContextProvider } from '../public/application/sections/policy_table/policy_list_context';

initHttp(
  new HttpService().setup({
    injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
    fatalErrors: fatalErrorsServiceMock.createSetupContract(),
  })
);
initUiMetric(usageCollectionPluginMock.createSetupContract());

// use a date far in the past to check the sorting
const testDate = '2020-07-21T14:16:58.666Z';
const testDateFormatted = moment(testDate).format('MMM D, YYYY');

const testPolicy = {
  version: 0,
  modifiedDate: testDate,
  indices: [`index1`],
  indexTemplates: [`indexTemplate1`, `indexTemplate2`, `indexTemplate3`, `indexTemplate4`],
  name: `testy0`,
  policy: {
    name: `testy0`,
    phases: {},
  },
};

const policies: PolicyFromES[] = [testPolicy];
for (let i = 1; i < 105; i++) {
  policies.push({
    version: i,
    modifiedDate: moment().subtract(i, 'days').toISOString(),
    indices: i % 2 === 0 ? [`index${i}`] : [],
    indexTemplates: i % 2 === 0 ? [`indexTemplate${i}`] : [],
    name: `testy${i}`,
    policy: {
      name: `testy${i}`,
      phases: {},
    },
  });
}

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    createHref: jest.fn(),
  }),
}));

let component: ReactElement;

const snapshot = (rendered: string[]) => {
  expect(rendered).toMatchSnapshot();
};
const mountedSnapshot = (rendered: ReactWrapper) => {
  expect(takeMountedSnapshot(rendered)).toMatchSnapshot();
};
const names = (rendered: ReactWrapper) => {
  return findTestSubject(rendered, 'policyTablePolicyNameLink');
};
const namesText = (rendered: ReactWrapper): string[] => {
  return (names(rendered) as ReactWrapper).map((button) => button.text());
};

const testSort = (headerName: string) => {
  const rendered = mountWithIntl(component);
  const nameHeader = findTestSubject(rendered, `tableHeaderCell_${headerName}`).find('button');
  nameHeader.simulate('click');
  rendered.update();
  snapshot(namesText(rendered));
  nameHeader.simulate('click');
  rendered.update();
  snapshot(namesText(rendered));
};
const openContextMenu = (buttonIndex: number) => {
  const rendered = mountWithIntl(component);
  const actionsButton = findTestSubject(rendered, 'euiCollapsedItemActionsButton');
  actionsButton.at(buttonIndex).simulate('click');
  rendered.update();
  return rendered;
};

const TestComponent = ({ testPolicies }: { testPolicies: PolicyFromES[] }) => {
  return (
    <KibanaContextProvider services={{ getUrlForApp: () => '' }}>
      <PolicyListContextProvider>
        <PolicyTable updatePolicies={jest.fn()} policies={testPolicies} />
      </PolicyListContextProvider>
    </KibanaContextProvider>
  );
};
describe('policy table', () => {
  beforeEach(() => {
    component = <TestComponent testPolicies={policies} />;
  });

  test('should show empty state when there are no policies', () => {
    component = <TestComponent testPolicies={[]} />;
    const rendered = mountWithIntl(component);
    mountedSnapshot(rendered);
  });
  test('should change pages when a pagination link is clicked on', () => {
    const rendered = mountWithIntl(component);
    snapshot(namesText(rendered));
    const pagingButtons = rendered.find('.euiPaginationButton');
    pagingButtons.at(2).simulate('click');
    rendered.update();
    snapshot(namesText(rendered));
  });
  test('should show more when per page value is increased', () => {
    const rendered = mountWithIntl(component);
    const perPageButton = rendered.find('EuiTablePagination EuiPopover').find('button');
    perPageButton.simulate('click');
    rendered.update();
    const numberOfRowsButton = rendered.find('.euiContextMenuItem').at(1);
    numberOfRowsButton.simulate('click');
    rendered.update();
    expect(namesText(rendered).length).toBe(25);
  });
  test('should filter based on content of search input', () => {
    const rendered = mountWithIntl(component);
    const searchInput = rendered.find('.euiFieldSearch').first();
    ((searchInput.instance() as unknown) as HTMLInputElement).value = 'testy0';
    searchInput.simulate('keyup', { key: 'Enter', keyCode: 13, which: 13 });
    rendered.update();
    snapshot(namesText(rendered));
  });
  test('should sort when name header is clicked', () => {
    testSort('name_0');
  });
  test('should sort when modified date header is clicked', () => {
    testSort('modifiedDate_3');
  });
  test('should sort when linked indices header is clicked', () => {
    testSort('indices_2');
  });
  test('should sort when linked index templates header is clicked', () => {
    testSort('indexTemplates_1');
  });
  test('view indices button should be enabled when there are linked indices', () => {
    const rendered = openContextMenu(0);
    const buttons = rendered.find('button.euiContextMenuItem');
    expect(buttons.length).toBe(3);
    expect(buttons.at(0).text()).toBe('View indices linked to policy');
    expect(buttons.at(1).text()).toBe('Add policy to index template');
    expect(buttons.at(2).text()).toBe('Delete policy');
    expect((buttons.at(2).getDOMNode() as HTMLButtonElement).disabled).toBeTruthy();
  });
  test('view indices button should be disabled when there are no linked indices', () => {
    const rendered = openContextMenu(1);
    const buttons = rendered.find('button.euiContextMenuItem');
    expect(buttons.length).toBe(3);
    expect(buttons.at(0).text()).toBe('View indices linked to policy');
    expect(buttons.at(1).text()).toBe('Add policy to index template');
    expect(buttons.at(2).text()).toBe('Delete policy');
    expect((buttons.at(1).getDOMNode() as HTMLButtonElement).disabled).toBeFalsy();
  });
  test('confirmation modal should show when delete button is pressed', () => {
    const rendered = openContextMenu(1);
    const deleteButton = rendered.find('button.euiContextMenuItem').at(2);
    deleteButton.simulate('click');
    rendered.update();
    expect(rendered.find('.euiModal--confirmation').exists()).toBeTruthy();
  });
  test('confirmation modal should show when add policy to index template button is pressed', () => {
    const rendered = openContextMenu(1);
    const deleteButton = rendered.find('button.euiContextMenuItem').at(1);
    deleteButton.simulate('click');
    rendered.update();
    expect(rendered.find('.euiModal--confirmation').exists()).toBeTruthy();
  });
  test('displays policy properties', () => {
    const rendered = mountWithIntl(component);
    const firstRow = findTestSubject(rendered, 'policyTableRow-testy0').text();
    const numberOfIndices = testPolicy.indices.length;
    const numberOfIndexTemplates = testPolicy.indexTemplates.length;
    expect(firstRow).toBe(
      `Nametesty0Linked index templates${numberOfIndexTemplates}Linked indices${numberOfIndices}Modified date${testDateFormatted}`
    );
  });
  test('opens a flyout with index templates', () => {
    const rendered = mountWithIntl(component);
    const indexTemplatesButton = findTestSubject(rendered, 'viewIndexTemplates').at(0);
    indexTemplatesButton.simulate('click');
    rendered.update();
    const flyoutTitle = findTestSubject(rendered, 'indexTemplatesFlyoutHeader').text();
    expect(flyoutTitle).toContain('testy0');
    const indexTemplatesLinks = findTestSubject(rendered, 'indexTemplateLink');
    expect(indexTemplatesLinks.length).toBe(testPolicy.indexTemplates.length);
  });
});
