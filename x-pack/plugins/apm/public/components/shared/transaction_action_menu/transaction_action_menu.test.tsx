/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { License } from '../../../../../licensing/common/license';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import { LicenseContext } from '../../../context/license/license_context';
import * as hooks from '../../../hooks/use_fetcher';
import * as apmApi from '../../../services/rest/create_call_apm_api';
import {
  expectTextsInDocument,
  expectTextsNotInDocument,
} from '../../../utils/test_helpers';
import { TransactionActionMenu } from './transaction_action_menu';
import * as Transactions from './__fixtures__/mock_data';

function getMockAPMContext({ canSave }: { canSave: boolean }) {
  return {
    ...mockApmPluginContextValue,
    core: {
      ...mockApmPluginContextValue.core,
      application: { capabilities: { apm: { save: canSave }, ml: {} } },
    },
  } as unknown as ApmPluginContextValue;
}

function Wrapper({ children }: { children?: React.ReactNode }) {
  return (
    <MemoryRouter>
      <MockApmPluginContextWrapper value={getMockAPMContext({ canSave: true })}>
        {children}
      </MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

const renderTransaction = async (transaction: Record<string, any>) => {
  const rendered = render(
    <TransactionActionMenu
      isLoading={false}
      transaction={transaction as Transaction}
    />,
    {
      wrapper: Wrapper,
    }
  );

  fireEvent.click(rendered.getByText('Investigate'));

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

    expect(queryByText('View transaction in Discover')).not.toBeNull();
  });

  it('always renders the trace logs link', async () => {
    const { getByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(
      (getByText('Trace logs').parentElement as HTMLAnchorElement).href
    ).toEqual(
      'http://localhost/basepath/app/logs/link-to/logs?time=1545092070952&filter=trace.id:%228b60bd32ecc6e1506735a8b6cfcf175c%22%20OR%20%228b60bd32ecc6e1506735a8b6cfcf175c%22'
    );
  });

  describe('when there is no pod id', () => {
    it('does not render the Pod logs link', async () => {
      const { queryByText } = await renderTransaction(
        Transactions.transactionWithMinimalData
      );

      expect(queryByText('Pod logs')).toBeNull();
    });

    it('does not render the Pod metrics link', async () => {
      const { queryByText } = await renderTransaction(
        Transactions.transactionWithMinimalData
      );

      expect(queryByText('Pod metrics')).toBeNull();
    });
  });

  describe('when there is a pod id', () => {
    it('renders the pod logs link', async () => {
      const { getByText } = await renderTransaction(
        Transactions.transactionWithKubernetesData
      );

      expect(
        (getByText('Pod logs').parentElement as HTMLAnchorElement).href
      ).toEqual(
        'http://localhost/basepath/app/logs/link-to/pod-logs/pod123456abcdef?time=1545092070952'
      );
    });

    it('renders the pod metrics link', async () => {
      const { getByText } = await renderTransaction(
        Transactions.transactionWithKubernetesData
      );

      expect(
        (getByText('Pod metrics').parentElement as HTMLAnchorElement).href
      ).toEqual(
        'http://localhost/basepath/app/metrics/link-to/pod-detail/pod123456abcdef?from=1545091770952&to=1545092370952'
      );
    });
  });

  describe('when there is no container id', () => {
    it('does not render the Container logs link', async () => {
      const { queryByText } = await renderTransaction(
        Transactions.transactionWithMinimalData
      );

      expect(queryByText('Container logs')).toBeNull();
    });

    it('does not render the Container metrics link', async () => {
      const { queryByText } = await renderTransaction(
        Transactions.transactionWithMinimalData
      );

      expect(queryByText('Container metrics')).toBeNull();
    });
  });

  describe('when there is a container id', () => {
    it('renders the Container logs link', async () => {
      const { getByText } = await renderTransaction(
        Transactions.transactionWithContainerData
      );

      expect(
        (getByText('Container logs').parentElement as HTMLAnchorElement).href
      ).toEqual(
        'http://localhost/basepath/app/logs/link-to/container-logs/container123456abcdef?time=1545092070952'
      );
    });

    it('renders the Container metrics link', async () => {
      const { getByText } = await renderTransaction(
        Transactions.transactionWithContainerData
      );

      expect(
        (getByText('Container metrics').parentElement as HTMLAnchorElement).href
      ).toEqual(
        'http://localhost/basepath/app/metrics/link-to/container-detail/container123456abcdef?from=1545091770952&to=1545092370952'
      );
    });
  });

  describe('when there is no hostname', () => {
    it('does not render the Host logs link', async () => {
      const { queryByText } = await renderTransaction(
        Transactions.transactionWithMinimalData
      );

      expect(queryByText('Host logs')).toBeNull();
    });

    it('does not render the Host metrics link', async () => {
      const { queryByText } = await renderTransaction(
        Transactions.transactionWithMinimalData
      );

      expect(queryByText('Host metrics')).toBeNull();
    });
  });

  describe('when there is a hostname', () => {
    it('renders the Host logs link', async () => {
      const { getByText } = await renderTransaction(
        Transactions.transactionWithHostData
      );

      expect(
        (getByText('Host logs').parentElement as HTMLAnchorElement).href
      ).toEqual(
        'http://localhost/basepath/app/logs/link-to/host-logs/227453131a17?time=1545092070952'
      );
    });

    it('renders the Host metrics link', async () => {
      const { getByText } = await renderTransaction(
        Transactions.transactionWithHostData
      );

      expect(
        (getByText('Host metrics').parentElement as HTMLAnchorElement).href
      ).toEqual(
        'http://localhost/basepath/app/metrics/link-to/host-detail/227453131a17?from=1545091770952&to=1545092370952'
      );
    });
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

  describe('when there is a url with a domain', () => {
    it('renders the uptime link', async () => {
      const { getByText } = await renderTransaction(
        Transactions.transactionWithUrlAndDomain
      );

      expect(
        (getByText('Status').parentElement as HTMLAnchorElement).href
      ).toEqual(
        'http://localhost/basepath/app/uptime?search=url.domain:%22example.com%22'
      );
    });
  });

  it('matches the snapshot', async () => {
    const { container } = await renderTransaction(
      Transactions.transactionWithAllData
    );

    expect(container).toMatchSnapshot();
  });

  describe('Custom links', () => {
    beforeAll(() => {
      // Mocks callApmAPI because it's going to be used to fecth the transaction in the custom links flyout.
      jest.spyOn(apmApi, 'callApmApi').mockResolvedValue({});
    });
    afterAll(() => {
      jest.resetAllMocks();
    });
    function renderTransactionActionMenuWithLicense(license: License) {
      return render(
        <LicenseContext.Provider value={license}>
          <TransactionActionMenu
            isLoading={false}
            transaction={Transactions.transactionWithMinimalData as Transaction}
          />
        </LicenseContext.Provider>,
        { wrapper: Wrapper }
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
        fireEvent.click(component.getByText('Investigate'));
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
          <TransactionActionMenu
            isLoading={false}
            transaction={Transactions.transactionWithMinimalData as Transaction}
          />
        </LicenseContext.Provider>,
        { wrapper: Wrapper }
      );
      act(() => {
        fireEvent.click(component.getByText('Investigate'));
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
        fireEvent.click(component.getByText('Investigate'));
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
        fireEvent.click(component.getByText('Investigate'));
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
        fireEvent.click(component.getByText('Investigate'));
      });
      expectTextsInDocument(component, ['Custom Links']);
      act(() => {
        fireEvent.click(component.getByText('Create custom link'));
      });
      expectTextsInDocument(component, ['Create link']);
      const getFilterKeyValue = (key: string) => {
        return {
          [(component.getAllByText(key)[0] as HTMLOptionElement).text]: (
            component
              .getByTestId(`${key}.value`)
              .querySelector(
                '[data-test-subj="comboBoxInput"] span'
              ) as HTMLSpanElement
          ).textContent,
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
