/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiIcon } from '@elastic/eui';
import type { ReactWrapper } from 'enzyme';
import React from 'react';

import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { findTestSubject, mountWithIntl } from '@kbn/test-jest-helpers';
import type { PublicMethodsOf } from '@kbn/utility-types';

import { DisabledBadge, ReservedBadge } from '../../badges';
import { rolesAPIClientMock } from '../index.mock';
import type { RolesAPIClient } from '../roles_api_client';
import { PermissionDenied } from './permission_denied';
import { RolesGridPage } from './roles_grid_page';

const mock403 = () => ({ body: { statusCode: 403 } });

const waitForRender = async (
  wrapper: ReactWrapper<any>,
  condition: (wrapper: ReactWrapper<any>) => boolean
) => {
  return new Promise<void>((resolve, reject) => {
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
  let history: ReturnType<typeof scopedHistoryMock.create>;

  beforeEach(() => {
    history = scopedHistoryMock.create();
    history.createHref.mockImplementation((location) => location.pathname!);

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
      {
        name: 'special%chars%role',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
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

  it('renders role actions as appropriate, escaping when necessary', async () => {
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

    let editButton = wrapper.find('EuiButtonEmpty[data-test-subj="edit-role-action-test-role-1"]');
    expect(editButton).toHaveLength(1);
    expect(editButton.prop('href')).toBe('/edit/test-role-1');

    editButton = wrapper.find(
      'EuiButtonEmpty[data-test-subj="edit-role-action-special%chars%role"]'
    );
    expect(editButton).toHaveLength(1);
    expect(editButton.prop('href')).toBe('/edit/special%25chars%25role');

    let cloneButton = wrapper.find(
      'EuiButtonEmpty[data-test-subj="clone-role-action-test-role-1"]'
    );
    expect(cloneButton).toHaveLength(1);
    expect(cloneButton.prop('href')).toBe('/clone/test-role-1');

    cloneButton = wrapper.find(
      'EuiButtonEmpty[data-test-subj="clone-role-action-special%chars%role"]'
    );
    expect(cloneButton).toHaveLength(1);
    expect(cloneButton.prop('href')).toBe('/clone/special%25chars%25role');

    expect(
      wrapper.find('EuiButtonEmpty[data-test-subj="edit-role-action-disabled-role"]')
    ).toHaveLength(1);
    expect(
      wrapper.find('EuiButtonEmpty[data-test-subj="clone-role-action-disabled-role"]')
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
        name: 'special%chars%role',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
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
        name: 'special%chars%role',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
      },
      {
        name: 'test-role-1',
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ base: [], spaces: [], feature: {} }],
      },
    ]);
  });
});
