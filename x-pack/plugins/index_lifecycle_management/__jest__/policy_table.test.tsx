/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import React, { ReactElement } from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { findTestSubject, takeMountedSnapshot } from '@elastic/eui/lib/test';

import {
  fatalErrorsServiceMock,
  injectedMetadataServiceMock,
  docLinksServiceMock,
} from '@kbn/core/public/mocks';
import { HttpService } from '@kbn/core/public/http';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';

import { PolicyFromES } from '../common/types';
import { PolicyList } from '../public/application/sections/policy_list/policy_list';
import { init as initHttp } from '../public/application/services/http';
import { init as initUiMetric } from '../public/application/services/ui_metric';
import { KibanaContextProvider } from '../public/shared_imports';
import { PolicyListContextProvider } from '../public/application/sections/policy_list/policy_list_context';
import { executionContextServiceMock } from '@kbn/core/public/execution_context/execution_context_service.mock';

initHttp(
  new HttpService().setup({
    injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
    fatalErrors: fatalErrorsServiceMock.createSetupContract(),
    executionContext: executionContextServiceMock.createSetupContract(),
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
const getPolicyLinks = (rendered: ReactWrapper) => {
  return findTestSubject(rendered, 'policyTablePolicyNameLink');
};
const getPolicyNames = (rendered: ReactWrapper): string[] => {
  return (getPolicyLinks(rendered) as ReactWrapper).map((button) => button.text());
};

const testSort = (headerName: string) => {
  const rendered = mountWithIntl(component);
  const nameHeader = findTestSubject(rendered, `tableHeaderCell_${headerName}`).find('button');
  nameHeader.simulate('click');
  rendered.update();
  snapshot(getPolicyNames(rendered));
  nameHeader.simulate('click');
  rendered.update();
  snapshot(getPolicyNames(rendered));
};

const TestComponent = ({ testPolicies }: { testPolicies: PolicyFromES[] }) => {
  return (
    <KibanaContextProvider
      services={{ getUrlForApp: () => '', docLinks: docLinksServiceMock.createStartContract() }}
    >
      <PolicyListContextProvider>
        <PolicyList updatePolicies={jest.fn()} policies={testPolicies} />
      </PolicyListContextProvider>
    </KibanaContextProvider>
  );
};
describe('policy table', () => {
  beforeEach(() => {
    component = <TestComponent testPolicies={policies} />;
  });

  test('shows empty state when there are no policies', () => {
    component = <TestComponent testPolicies={[]} />;
    const rendered = mountWithIntl(component);
    mountedSnapshot(rendered);
  });
  test('changes pages when a pagination link is clicked on', () => {
    const rendered = mountWithIntl(component);
    snapshot(getPolicyNames(rendered));
    const pagingButtons = rendered.find('.euiPaginationButton');
    pagingButtons.at(2).simulate('click');
    rendered.update();
    snapshot(getPolicyNames(rendered));
  });
  test('shows more policies when "Rows per page" value is increased', () => {
    const rendered = mountWithIntl(component);
    const perPageButton = rendered.find('EuiTablePagination EuiPopover').find('button');
    perPageButton.simulate('click');
    rendered.update();
    const numberOfRowsButton = rendered.find('.euiContextMenuItem').at(1);
    numberOfRowsButton.simulate('click');
    rendered.update();
    expect(getPolicyNames(rendered).length).toBe(25);
  });
  test('filters based on content of search input', () => {
    const rendered = mountWithIntl(component);
    const searchInput = rendered.find('.euiFieldSearch').first();
    (searchInput.instance() as unknown as HTMLInputElement).value = 'testy0';
    searchInput.simulate('keyup', { key: 'Enter', keyCode: 13, which: 13 });
    rendered.update();
    snapshot(getPolicyNames(rendered));
  });
  test('sorts when name header is clicked', () => {
    testSort('name_0');
  });
  test('sorts when modified date header is clicked', () => {
    testSort('modifiedDate_3');
  });
  test('sorts when linked indices header is clicked', () => {
    testSort('indices_2');
  });
  test('sorts when linked index templates header is clicked', () => {
    testSort('indexTemplates_1');
  });
  test('delete policy button is disabled when there are linked indices', () => {
    const rendered = mountWithIntl(component);
    const policyRow = findTestSubject(rendered, `policyTableRow-${testPolicy.name}`);
    const deleteButton = findTestSubject(policyRow, 'deletePolicy');
    expect(deleteButton.props().disabled).toBeTruthy();
  });
  test('delete policy button is enabled when there are no linked indices', () => {
    const rendered = mountWithIntl(component);
    const policyRow = findTestSubject(rendered, `policyTableRow-testy1`);
    const deleteButton = findTestSubject(policyRow, 'deletePolicy');
    expect(deleteButton.props().disabled).toBeFalsy();
  });
  test('confirmation modal shows when delete button is pressed', () => {
    const rendered = mountWithIntl(component);
    const policyRow = findTestSubject(rendered, `policyTableRow-testy1`);
    const addPolicyToTemplateButton = findTestSubject(policyRow, 'deletePolicy');
    addPolicyToTemplateButton.simulate('click');
    rendered.update();
    expect(findTestSubject(rendered, 'deletePolicyModal').exists()).toBeTruthy();
  });
  test('add index template modal shows when add policy to index template button is pressed', () => {
    const rendered = mountWithIntl(component);
    const policyRow = findTestSubject(rendered, `policyTableRow-${testPolicy.name}`);
    const addPolicyToTemplateButton = findTestSubject(policyRow, 'addPolicyToTemplate');
    addPolicyToTemplateButton.simulate('click');
    rendered.update();
    expect(findTestSubject(rendered, 'addPolicyToTemplateModal').exists()).toBeTruthy();
  });
  test('displays policy properties', () => {
    const rendered = mountWithIntl(component);
    const firstRow = findTestSubject(rendered, 'policyTableRow-testy0');
    const policyName = findTestSubject(firstRow, 'policy-name').text();
    expect(policyName).toBe(`Name${testPolicy.name}`);
    const policyIndexTemplates = findTestSubject(firstRow, 'policy-indexTemplates').text();
    expect(policyIndexTemplates).toBe(`Linked index templates${testPolicy.indexTemplates.length}`);
    const policyIndices = findTestSubject(firstRow, 'policy-indices').text();
    expect(policyIndices).toBe(`Linked indices${testPolicy.indices.length}`);
    const policyModifiedDate = findTestSubject(firstRow, 'policy-modifiedDate').text();
    expect(policyModifiedDate).toBe(`Modified date${testDateFormatted}`);
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
