/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from '@testing-library/react';

import { HealthCheck } from './health_check';

import { act } from 'react-dom/test-utils';
import { HealthContextProvider } from '../context/health_context';
import { useKibana } from '../../common/lib/kibana';
jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('health check', () => {
  test('renders spinner while health is loading', async () => {
    useKibanaMock().services.http.get = jest
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}));
    const { queryByText, container } = render(
      <HealthContextProvider>
        <HealthCheck waitForCheck={true}>
          <p>{'shouldnt render'}</p>
        </HealthCheck>
      </HealthContextProvider>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    expect(container.getElementsByClassName('euiLoadingSpinner').length).toBe(1);
    expect(queryByText('shouldnt render')).not.toBeInTheDocument();
  });

  it('renders children immediately if waitForCheck is false', async () => {
    useKibanaMock().services.http.get = jest
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}));

    const { queryByText, container } = render(
      <HealthContextProvider>
        <HealthCheck waitForCheck={false}>
          <p>{'should render'}</p>
        </HealthCheck>
      </HealthContextProvider>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    expect(container.getElementsByClassName('euiLoadingSpinner').length).toBe(0);
    expect(queryByText('should render')).toBeInTheDocument();
  });

  it('renders children if keys are enabled', async () => {
    useKibanaMock().services.http.get = jest
      .fn()
      .mockResolvedValue({ isSufficientlySecure: true, hasPermanentEncryptionKey: true });
    const { queryByText } = render(
      <HealthContextProvider>
        <HealthCheck waitForCheck={true}>
          <p>{'should render'}</p>
        </HealthCheck>
      </HealthContextProvider>
    );
    await act(async () => {
      // wait for useEffect to run
    });
    expect(queryByText('should render')).toBeInTheDocument();
  });

  test('renders warning if keys are disabled', async () => {
    useKibanaMock().services.http.get = jest.fn().mockImplementationOnce(async () => ({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: true,
    }));
    const { queryAllByText } = render(
      <HealthContextProvider>
        <HealthCheck waitForCheck={true}>
          <p>{'should render'}</p>
        </HealthCheck>
      </HealthContextProvider>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    const [description, action] = queryAllByText(/TLS/i);

    expect(description.textContent).toMatchInlineSnapshot(
      `"Alerting relies on API keys, which require TLS between Elasticsearch and Kibana. Learn how to enable TLS.(opens in a new tab or window)"`
    );

    expect(action.textContent).toMatchInlineSnapshot(
      `"Learn how to enable TLS.(opens in a new tab or window)"`
    );

    expect(action.getAttribute('href')).toMatchInlineSnapshot(
      `"https://www.elastic.co/guide/en/kibana/mocked-test-branch/configuring-tls.html"`
    );
  });

  test('renders warning if encryption key is ephemeral', async () => {
    useKibanaMock().services.http.get = jest.fn().mockImplementationOnce(async () => ({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
    }));
    const { queryByText, queryByRole } = render(
      <HealthContextProvider>
        <HealthCheck waitForCheck={true}>
          <p>{'should render'}</p>
        </HealthCheck>
      </HealthContextProvider>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    const description = queryByRole(/banner/i);
    expect(description!.textContent).toMatchInlineSnapshot(
      `"To create an alert, set a value for xpack.encryptedSavedObjects.encryptionKey in your kibana.yml file. Learn how.(opens in a new tab or window)"`
    );

    const action = queryByText(/Learn/i);
    expect(action!.textContent).toMatchInlineSnapshot(`"Learn how.(opens in a new tab or window)"`);
    expect(action!.getAttribute('href')).toMatchInlineSnapshot(
      `"https://www.elastic.co/guide/en/kibana/mocked-test-branch/alert-action-settings-kb.html#general-alert-action-settings"`
    );
  });

  test('renders warning if encryption key is ephemeral and keys are disabled', async () => {
    useKibanaMock().services.http.get = jest.fn().mockImplementationOnce(async () => ({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: false,
    }));

    const { queryByText } = render(
      <HealthContextProvider>
        <HealthCheck waitForCheck={true}>
          <p>{'should render'}</p>
        </HealthCheck>
      </HealthContextProvider>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    const description = queryByText(/Transport Layer Security/i);

    expect(description!.textContent).toMatchInlineSnapshot(
      `"You must enable Transport Layer Security between Kibana and Elasticsearch and configure an encryption key in your kibana.yml file. Learn how(opens in a new tab or window)"`
    );

    const action = queryByText(/Learn/i);
    expect(action!.textContent).toMatchInlineSnapshot(`"Learn how(opens in a new tab or window)"`);
    expect(action!.getAttribute('href')).toMatchInlineSnapshot(
      `"https://www.elastic.co/guide/en/kibana/mocked-test-branch/alerting-getting-started.html#alerting-setup-prerequisites"`
    );
  });
});
