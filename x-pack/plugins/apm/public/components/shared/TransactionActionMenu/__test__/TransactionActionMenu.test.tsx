/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { merge, tail } from 'lodash';
import { TransactionActionMenu } from '../TransactionActionMenu';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import * as Transactions from './mockData';
import {
  expectTextsNotInDocument,
  expectTextsInDocument,
} from '../../../../utils/testHelpers';
import * as hooks from '../../../../hooks/useFetcher';
import { LicenseContext } from '../../../../context/LicenseContext';
import { License } from '../../../../../../licensing/common/license';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue,
} from '../../../../context/ApmPluginContext/MockApmPluginContext';
import * as apmApi from '../../../../services/rest/createCallApmApi';
import { ApmPluginContextValue } from '../../../../context/ApmPluginContext';

const getMock = () => {
  return (merge({}, mockApmPluginContextValue, {
    core: {
      application: {
        navigateToApp: jest.fn(),
      },
      http: {
        basePath: {
          remove: jest.fn((path: string) => {
            return tail(path.split('/')).join('/');
          }),
        },
      },
    },
  }) as unknown) as ApmPluginContextValue;
};

const renderTransaction = async (
  transaction: Record<string, any>,
  mock: ApmPluginContextValue = getMock()
) => {
  const rendered = render(
    <TransactionActionMenu transaction={transaction as Transaction} />,
    {
      wrapper: ({ children }: { children?: React.ReactNode }) => (
        <MockApmPluginContextWrapper value={mock}>
          {children}
        </MockApmPluginContextWrapper>
      ),
    }
  );

  fireEvent.click(rendered.getByText('Actions'));

  return rendered;
};

describe('TransactionActionMenu component', () => {
  beforeAll(() => {
    jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      data: [],
      status: hooks.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });
  });
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('should always render the discover link', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('View sample document')).not.toBeNull();
  });

  it('should always render the trace logs link', async () => {
    const mock = getMock();

    const { queryByText, getByText } = await renderTransaction(
      Transactions.transactionWithMinimalData,
      mock
    );

    expect(queryByText('Trace logs')).not.toBeNull();

    fireEvent.click(getByText('Trace logs'));

    expect(mock.core.application.navigateToApp).toHaveBeenCalledWith('logs', {
      path:
        'link-to/logs?time=1545092070952&filter=trace.id:%228b60bd32ecc6e1506735a8b6cfcf175c%22%20OR%20%228b60bd32ecc6e1506735a8b6cfcf175c%22',
    });
  });

  it('should not render the pod links when there is no pod id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Pod logs')).toBeNull();
    expect(queryByText('Pod metrics')).toBeNull();
  });

  it('should render the pod links when there is a pod id', async () => {
    const mock = getMock();

    const { queryByText, getByText } = await renderTransaction(
      Transactions.transactionWithKubernetesData,
      mock
    );

    expect(queryByText('Pod logs')).not.toBeNull();
    expect(queryByText('Pod metrics')).not.toBeNull();

    fireEvent.click(getByText('Pod logs'));

    expect(mock.core.application.navigateToApp).toHaveBeenCalledWith('logs', {
      path: 'link-to/pod-logs/pod123456abcdef?time=1545092070952',
    });

    (mock.core.application.navigateToApp as jest.Mock).mockClear();

    fireEvent.click(getByText('Pod metrics'));

    expect(mock.core.application.navigateToApp).toHaveBeenCalledWith(
      'metrics',
      {
        path:
          'link-to/pod-detail/pod123456abcdef?from=1545091770952&to=1545092370952',
      }
    );
  });

  it('should not render the container links when there is no container id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Container logs')).toBeNull();
    expect(queryByText('Container metrics')).toBeNull();
  });

  it('should render the container links when there is a container id', async () => {
    const mock = getMock();

    const { queryByText, getByText } = await renderTransaction(
      Transactions.transactionWithContainerData,
      mock
    );

    expect(queryByText('Container logs')).not.toBeNull();
    expect(queryByText('Container metrics')).not.toBeNull();

    fireEvent.click(getByText('Container logs'));

    expect(mock.core.application.navigateToApp).toHaveBeenCalledWith('logs', {
      path: 'link-to/container-logs/container123456abcdef?time=1545092070952',
    });

    (mock.core.application.navigateToApp as jest.Mock).mockClear();

    fireEvent.click(getByText('Container metrics'));

    expect(mock.core.application.navigateToApp).toHaveBeenCalledWith(
      'metrics',
      {
        path:
          'link-to/container-detail/container123456abcdef?from=1545091770952&to=1545092370952',
      }
    );
  });

  it('should not render the host links when there is no hostname', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Host logs')).toBeNull();
    expect(queryByText('Host metrics')).toBeNull();
  });

  it('should render the host links when there is a hostname', async () => {
    const mock = getMock();
    const { queryByText, getByText } = await renderTransaction(
      Transactions.transactionWithHostData,
      mock
    );

    expect(queryByText('Host logs')).not.toBeNull();
    expect(queryByText('Host metrics')).not.toBeNull();

    fireEvent.click(getByText('Host logs'));

    expect(mock.core.application.navigateToApp).toHaveBeenCalledWith('logs', {
      path: 'link-to/host-logs/227453131a17?time=1545092070952',
    });

    (mock.core.application.navigateToApp as jest.Mock).mockClear();

    fireEvent.click(getByText('Host metrics'));

    expect(mock.core.application.navigateToApp).toHaveBeenCalledWith(
      'metrics',
      {
        path:
          'link-to/host-detail/227453131a17?from=1545091770952&to=1545092370952',
      }
    );
  });

  it('should not render the uptime link if there is no url available', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Status')).toBeNull();
  });

  it('should not render the uptime link if there is no domain available', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithUrlWithoutDomain
    );

    expect(queryByText('Status')).toBeNull();
  });

  it('should render the uptime link if there is a url with a domain', async () => {
    const mock = getMock();

    const { queryByText, getByText } = await renderTransaction(
      Transactions.transactionWithUrlAndDomain,
      mock
    );

    expect(queryByText('Status')).not.toBeNull();

    fireEvent.click(getByText('Status'));

    expect(mock.core.application.navigateToApp).toHaveBeenCalledWith('uptime', {
      path: '?search=url.domain:%22example.com%22',
    });
  });

  it('should match the snapshot', async () => {
    const { container } = await renderTransaction(
      Transactions.transactionWithAllData
    );

    expect(container).toMatchSnapshot();
  });

  describe('Custom links', () => {
    beforeAll(() => {
      // Mocks callApmAPI because it's going to be used to fecth the transaction in the custom links flyout.
      jest.spyOn(apmApi, 'callApmApi').mockReturnValue({});
    });
    afterAll(() => {
      jest.resetAllMocks();
    });
    function renderTransactionActionMenuWithLicense(license: License) {
      return render(
        <LicenseContext.Provider value={license}>
          <MockApmPluginContextWrapper>
            <TransactionActionMenu
              transaction={
                Transactions.transactionWithMinimalData as Transaction
              }
            />
          </MockApmPluginContextWrapper>
        </LicenseContext.Provider>
      );
    }
    it('doesnt show custom links when license is not valid', () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'gold',
          status: 'invalid',
          type: 'gold',
          uid: '1',
        },
      });
      const component = renderTransactionActionMenuWithLicense(license);
      act(() => {
        fireEvent.click(component.getByText('Actions'));
      });
      expectTextsNotInDocument(component, ['Custom Links']);
    });
    it('doesnt show custom links when basic license', () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'basic',
          status: 'active',
          type: 'basic',
          uid: '1',
        },
      });
      const component = render(
        <LicenseContext.Provider value={license}>
          <MockApmPluginContextWrapper>
            <TransactionActionMenu
              transaction={
                Transactions.transactionWithMinimalData as Transaction
              }
            />
          </MockApmPluginContextWrapper>
        </LicenseContext.Provider>
      );
      act(() => {
        fireEvent.click(component.getByText('Actions'));
      });
      expectTextsNotInDocument(component, ['Custom Links']);
    });
    it('shows custom links when trial license', () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'trial',
          status: 'active',
          type: 'trial',
          uid: '1',
        },
      });
      const component = renderTransactionActionMenuWithLicense(license);
      act(() => {
        fireEvent.click(component.getByText('Actions'));
      });
      expectTextsInDocument(component, ['Custom Links']);
    });
    it('shows custom links when gold license', () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'gold',
          status: 'active',
          type: 'gold',
          uid: '1',
        },
      });
      const component = renderTransactionActionMenuWithLicense(license);
      act(() => {
        fireEvent.click(component.getByText('Actions'));
      });
      expectTextsInDocument(component, ['Custom Links']);
    });
    it('opens flyout with filters prefilled', () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'gold',
          status: 'active',
          type: 'gold',
          uid: '1',
        },
      });
      const component = renderTransactionActionMenuWithLicense(license);
      act(() => {
        fireEvent.click(component.getByText('Actions'));
      });
      expectTextsInDocument(component, ['Custom Links']);
      act(() => {
        fireEvent.click(component.getByText('Create custom link'));
      });
      expectTextsInDocument(component, ['Create link']);
      const getFilterKeyValue = (key: string) => {
        return {
          [(component.getAllByText(key)[0] as HTMLOptionElement)
            .text]: (component.getAllByTestId(
            `${key}.value`
          )[0] as HTMLInputElement).value,
        };
      };
      expect(getFilterKeyValue('service.name')).toEqual({
        'service.name': 'opbeans-go',
      });
      expect(getFilterKeyValue('transaction.name')).toEqual({
        'transaction.name': 'GET /api/products/:id/customers',
      });
      expect(getFilterKeyValue('transaction.type')).toEqual({
        'transaction.type': 'request',
      });
      // Forces component to unmount to prevent to update the state when callApmAPI call returns after the test is finished.
      component.unmount();
    });
  });
});
