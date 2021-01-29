/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment-timezone';
import React, { ReactElement } from 'react';
import { ReactWrapper } from 'enzyme';
import { mountWithIntl } from '@kbn/test/jest';
import { findTestSubject, takeMountedSnapshot } from '@elastic/eui/lib/test';

import {
  fatalErrorsServiceMock,
  injectedMetadataServiceMock,
  scopedHistoryMock,
} from '../../../../../src/core/public/mocks';
import { HttpService } from '../../../../../src/core/public/http';
import { usageCollectionPluginMock } from '../../../../../src/plugins/usage_collection/public/mocks';

import { PolicyFromES } from '../../common/types';
import { PolicyTable } from '../../public/application/sections/policy_table/policy_table';
import { init as initHttp } from '../../public/application/services/http';
import { init as initUiMetric } from '../../public/application/services/ui_metric';

initHttp(
  new HttpService().setup({
    injectedMetadata: injectedMetadataServiceMock.createSetupContract(),
    fatalErrors: fatalErrorsServiceMock.createSetupContract(),
  })
);
initUiMetric(usageCollectionPluginMock.createSetupContract());

const policies: PolicyFromES[] = [];
for (let i = 0; i < 105; i++) {
  policies.push({
    version: i,
    modified_date: moment().subtract(i, 'days').toISOString(),
    linkedIndices: i % 2 === 0 ? [`index${i}`] : undefined,
    name: `testy${i}`,
    policy: {
      name: `testy${i}`,
      phases: {},
    },
  });
}
jest.mock('');
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
  const nameHeader = findTestSubject(rendered, `policyTableHeaderCell-${headerName}`).find(
    'button'
  );
  nameHeader.simulate('click');
  rendered.update();
  snapshot(namesText(rendered));
  nameHeader.simulate('click');
  rendered.update();
  snapshot(namesText(rendered));
};
const openContextMenu = (buttonIndex: number) => {
  const rendered = mountWithIntl(component);
  const actionsButton = findTestSubject(rendered, 'policyActionsContextMenuButton');
  actionsButton.at(buttonIndex).simulate('click');
  rendered.update();
  return rendered;
};

describe('policy table', () => {
  beforeEach(() => {
    component = (
      <PolicyTable
        policies={policies}
        history={scopedHistoryMock.create()}
        navigateToApp={jest.fn()}
        updatePolicies={jest.fn()}
      />
    );
  });

  test('should show empty state when there are not any policies', () => {
    component = (
      <PolicyTable
        policies={[]}
        history={scopedHistoryMock.create()}
        navigateToApp={jest.fn()}
        updatePolicies={jest.fn()}
      />
    );
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
    const fiftyButton = rendered.find('.euiContextMenuItem').at(1);
    fiftyButton.simulate('click');
    rendered.update();
    expect(namesText(rendered).length).toBe(50);
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
    testSort('name');
  });
  test('should sort when version header is clicked', () => {
    testSort('version');
  });
  test('should sort when modified date header is clicked', () => {
    testSort('modified_date');
  });
  test('should sort when linked indices header is clicked', () => {
    testSort('linkedIndices');
  });
  test('should have proper actions in context menu when there are linked indices', () => {
    const rendered = openContextMenu(0);
    const buttons = rendered.find('button.euiContextMenuItem');
    expect(buttons.length).toBe(3);
    expect(buttons.at(0).text()).toBe('View indices linked to policy');
    expect(buttons.at(1).text()).toBe('Add policy to index template');
    expect(buttons.at(2).text()).toBe('Delete policy');
    expect((buttons.at(2).getDOMNode() as HTMLButtonElement).disabled).toBeTruthy();
  });
  test('should have proper actions in context menu when there are not linked indices', () => {
    const rendered = openContextMenu(1);
    const buttons = rendered.find('button.euiContextMenuItem');
    expect(buttons.length).toBe(2);
    expect(buttons.at(0).text()).toBe('Add policy to index template');
    expect(buttons.at(1).text()).toBe('Delete policy');
    expect((buttons.at(1).getDOMNode() as HTMLButtonElement).disabled).toBeFalsy();
  });
  test('confirmation modal should show when delete button is pressed', () => {
    const rendered = openContextMenu(1);
    const deleteButton = rendered.find('button.euiContextMenuItem').at(1);
    deleteButton.simulate('click');
    rendered.update();
    expect(rendered.find('.euiModal--confirmation').exists()).toBeTruthy();
  });
  test('confirmation modal should show when add policy to index template button is pressed', () => {
    const rendered = openContextMenu(1);
    const deleteButton = rendered.find('button.euiContextMenuItem').at(0);
    deleteButton.simulate('click');
    rendered.update();
    expect(rendered.find('.euiModal--confirmation').exists()).toBeTruthy();
  });
});
