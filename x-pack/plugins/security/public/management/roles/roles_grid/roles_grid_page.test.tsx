/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiBasicTable } from '@elastic/eui';
import { ReactWrapper } from 'enzyme';
import React from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { RolesAPIClient } from '../roles_api_client';
import { PermissionDenied } from './permission_denied';
import { RolesGridPage } from './roles_grid_page';

import { coreMock, scopedHistoryMock } from '../../../../../../../src/core/public/mocks';
import { rolesAPIClientMock } from '../index.mock';
import { ReservedBadge, DisabledBadge } from '../../badges';
import { findTestSubject } from 'test_utils/find_test_subject';
import { ScopedHistory } from 'kibana/public';

const mock403 = () => ({ body: { statusCode: 403 } });

const waitForRender = async (
  wrapper: ReactWrapper<any>,
  condition: (wrapper: ReactWrapper<any>) => boolean
) => {
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      await Promise.resolve();
      wrapper.update();
      if (condition(wrapper)) {
        resolve();
      }
    }, 10);

    setTimeout(() => {
      clearInterval(interval);
      reject(new Error('waitForRender timeout after 2000ms'));
    }, 2000);
  });
};

describe('<RolesGridPage />', () => {
  let apiClientMock: jest.Mocked<PublicMethodsOf<RolesAPIClient>>;
  let history: ScopedHistory;

  beforeEach(() => {
    history = (scopedHistoryMock.create({
      createHref: jest.fn((location) => location.pathname!),
    }) as unknown) as ScopedHistory;
    apiClientMock = rolesAPIClientMock.create();
    apiClientMock.getRoles.mockResolvedValue([
      {
        name: 'test-role-1',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
      },
      {
        name: 'reserved-role',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
        metadata: { _reserved: true },
      },
      {
        name: 'disabled-role',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
        transient_metadata: { enabled: false },
      },
    ]);
  });

  it(`renders reserved roles as such`, async () => {
    const wrapper = mountWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={coreMock.createStart().notifications}
      />
    );
    const initialIconCount = wrapper.find(EuiIcon).length;

    await waitForRender(wrapper, (updatedWrapper) => {
      return updatedWrapper.find(EuiIcon).length > initialIconCount;
    });

    expect(wrapper.find(PermissionDenied)).toHaveLength(0);
    expect(wrapper.find(ReservedBadge)).toHaveLength(1);
  });

  it(`renders disabled roles as such`, async () => {
    const wrapper = mountWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={coreMock.createStart().notifications}
      />
    );
    const initialIconCount = wrapper.find(EuiIcon).length;

    await waitForRender(wrapper, (updatedWrapper) => {
      return updatedWrapper.find(EuiIcon).length > initialIconCount;
    });

    expect(wrapper.find(PermissionDenied)).toHaveLength(0);
    expect(wrapper.find(DisabledBadge)).toHaveLength(1);
  });

  it('renders permission denied if required', async () => {
    apiClientMock.getRoles.mockRejectedValue(mock403());

    const wrapper = mountWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={coreMock.createStart().notifications}
      />
    );
    await waitForRender(wrapper, (updatedWrapper) => {
      return updatedWrapper.find(PermissionDenied).length > 0;
    });
    expect(wrapper.find(PermissionDenied)).toMatchSnapshot();
  });

  it('renders role actions as appropriate', async () => {
    const wrapper = mountWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={coreMock.createStart().notifications}
      />
    );
    const initialIconCount = wrapper.find(EuiIcon).length;

    await waitForRender(wrapper, (updatedWrapper) => {
      return updatedWrapper.find(EuiIcon).length > initialIconCount;
    });

    expect(wrapper.find(PermissionDenied)).toHaveLength(0);

    const editButton = wrapper.find('EuiButtonIcon[data-test-subj="edit-role-action-test-role-1"]');
    expect(editButton).toHaveLength(1);
    expect(editButton.prop('href')).toBe('/edit/test-role-1');

    const cloneButton = wrapper.find(
      'EuiButtonIcon[data-test-subj="clone-role-action-test-role-1"]'
    );
    expect(cloneButton).toHaveLength(1);
    expect(cloneButton.prop('href')).toBe('/clone/test-role-1');

    expect(
      wrapper.find('EuiButtonIcon[data-test-subj="edit-role-action-disabled-role"]')
    ).toHaveLength(1);
    expect(
      wrapper.find('EuiButtonIcon[data-test-subj="clone-role-action-disabled-role"]')
    ).toHaveLength(1);
  });

  it('hides reserved roles when instructed to', async () => {
    const wrapper = mountWithIntl(
      <RolesGridPage
        rolesAPIClient={apiClientMock}
        history={history}
        notifications={coreMock.createStart().notifications}
      />
    );
    const initialIconCount = wrapper.find(EuiIcon).length;

    await waitForRender(wrapper, (updatedWrapper) => {
      return updatedWrapper.find(EuiIcon).length > initialIconCount;
    });

    expect(wrapper.find(EuiBasicTable).props().items).toEqual([
      {
        name: 'disabled-role',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
        transient_metadata: { enabled: false },
      },
      {
        name: 'reserved-role',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
        metadata: { _reserved: true },
      },
      {
        name: 'test-role-1',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
      },
    ]);

    findTestSubject(wrapper, 'showReservedRolesSwitch').simulate('click');

    expect(wrapper.find(EuiBasicTable).props().items).toEqual([
      {
        name: 'disabled-role',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
        transient_metadata: { enabled: false },
      },
      {
        name: 'test-role-1',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
      },
    ]);
  });
});
