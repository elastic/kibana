/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, fireEvent, act, wait } from '@testing-library/react';
import { TransactionActionMenu } from '../TransactionActionMenu';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import * as Transactions from './mockData';
import {
  expectTextsNotInDocument,
  expectTextsInDocument
} from '../../../../utils/testHelpers';
import * as hooks from '../../../../hooks/useFetcher';
import { LicenseContext } from '../../../../context/LicenseContext';
import { License } from '../../../../../../licensing/common/license';
import { MockApmPluginContextWrapper } from '../../../../context/ApmPluginContext/MockApmPluginContext';
import * as apmApi from '../../../../services/rest/createCallApmApi';

const renderTransaction = async (transaction: Record<string, any>) => {
  const rendered = render(
    <TransactionActionMenu transaction={transaction as Transaction} />,
    { wrapper: MockApmPluginContextWrapper }
  );

  fireEvent.click(rendered.getByText('Actions'));

  return rendered;
};

describe('TransactionActionMenu component', () => {
  beforeAll(() => {
    spyOn(hooks, 'useFetcher').and.returnValue({
      data: [],
      status: 'success'
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
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Trace logs')).not.toBeNull();
  });

  it('should not render the pod links when there is no pod id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Pod logs')).toBeNull();
    expect(queryByText('Pod metrics')).toBeNull();
  });

  it('should render the pod links when there is a pod id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithKubernetesData
    );

    expect(queryByText('Pod logs')).not.toBeNull();
    expect(queryByText('Pod metrics')).not.toBeNull();
  });

  it('should not render the container links when there is no container id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Container logs')).toBeNull();
    expect(queryByText('Container metrics')).toBeNull();
  });

  it('should render the container links when there is a container id', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithContainerData
    );

    expect(queryByText('Container logs')).not.toBeNull();
    expect(queryByText('Container metrics')).not.toBeNull();
  });

  it('should not render the host links when there is no hostname', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithMinimalData
    );

    expect(queryByText('Host logs')).toBeNull();
    expect(queryByText('Host metrics')).toBeNull();
  });

  it('should render the host links when there is a hostname', async () => {
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithHostData
    );

    expect(queryByText('Host logs')).not.toBeNull();
    expect(queryByText('Host metrics')).not.toBeNull();
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
    const { queryByText } = await renderTransaction(
      Transactions.transactionWithUrlAndDomain
    );

    expect(queryByText('Status')).not.toBeNull();
  });

  it('should match the snapshot', async () => {
    const { container } = await renderTransaction(
      Transactions.transactionWithAllData
    );

    expect(container).toMatchSnapshot();
  });

  describe('Custom links', () => {
    let callApmApiSpy: jasmine.Spy;
    beforeAll(() => {
      callApmApiSpy = spyOn(apmApi, 'callApmApi').and.returnValue({});
    });
    afterAll(() => {
      jest.resetAllMocks();
    });
    it('doesnt show custom links when license is not valid', () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'gold',
          status: 'invalid',
          type: 'gold',
          uid: '1'
        }
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
    it('doesnt show custom links when basic license', () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'basic',
          status: 'active',
          type: 'basic',
          uid: '1'
        }
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
          uid: '1'
        }
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
          uid: '1'
        }
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
      expectTextsInDocument(component, ['Custom Links']);
    });
    it('opens flyout with filters prefilled', async () => {
      const license = new License({
        signature: 'test signature',
        license: {
          expiryDateInMillis: 0,
          mode: 'gold',
          status: 'active',
          type: 'gold',
          uid: '1'
        }
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
      expectTextsInDocument(component, ['Custom Links']);
      act(() => {
        fireEvent.click(component.getByText('Create custom link'));
      });
      expectTextsInDocument(component, ['Create link']);
      await wait(() => expect(callApmApiSpy).toHaveBeenCalled());
      const getFilterKeyValue = (key: string) => {
        return {
          [(component.getAllByText(key)[0] as HTMLOptionElement)
            .text]: (component.getAllByTestId(
            `${key}.value`
          )[0] as HTMLInputElement).value
        };
      };
      expect(getFilterKeyValue('service.name')).toEqual({
        'service.name': 'opbeans-go'
      });
      expect(getFilterKeyValue('transaction.name')).toEqual({
        'transaction.name': 'GET /api/products/:id/customers'
      });
      expect(getFilterKeyValue('transaction.type')).toEqual({
        'transaction.type': 'request'
      });
    });
  });
});
