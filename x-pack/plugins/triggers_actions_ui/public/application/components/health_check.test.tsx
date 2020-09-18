/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from '@testing-library/react';

import { HealthCheck } from './health_check';

import { act } from 'react-dom/test-utils';
import { httpServiceMock } from '../../../../../../src/core/public/mocks';

const docLinks = { ELASTIC_WEBSITE_URL: 'elastic.co/', DOC_LINK_VERSION: 'current' };

const http = httpServiceMock.createStartContract();

describe('health check', () => {
  test('renders spinner while health is loading', async () => {
    http.get.mockImplementationOnce(() => new Promise(() => {}));

    const { queryByText, container } = render(
      <HealthCheck http={http} docLinks={docLinks}>
        <p>{'shouldnt render'}</p>
      </HealthCheck>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    expect(container.getElementsByClassName('euiLoadingSpinner').length).toBe(1);
    expect(queryByText('shouldnt render')).not.toBeInTheDocument();
  });

  it('renders children if keys are enabled', async () => {
    http.get.mockResolvedValue({ isSufficientlySecure: true, hasPermanentEncryptionKey: true });

    const { queryByText } = render(
      <HealthCheck http={http} docLinks={docLinks}>
        <p>{'should render'}</p>
      </HealthCheck>
    );
    await act(async () => {
      // wait for useEffect to run
    });
    expect(queryByText('should render')).toBeInTheDocument();
  });

  test('renders warning if keys are disabled', async () => {
    http.get.mockImplementationOnce(async () => ({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: true,
    }));

    const { queryAllByText } = render(
      <HealthCheck http={http} docLinks={docLinks}>
        <p>{'should render'}</p>
      </HealthCheck>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    const [description, action] = queryAllByText(/TLS/i);

    expect(description.textContent).toMatchInlineSnapshot(
      `"Alerting relies on API keys, which require TLS between Elasticsearch and Kibana. Learn how to enable TLS."`
    );

    expect(action.textContent).toMatchInlineSnapshot(`"Learn how to enable TLS."`);

    expect(action.getAttribute('href')).toMatchInlineSnapshot(
      `"elastic.co/guide/en/kibana/current/configuring-tls.html"`
    );
  });

  test('renders warning if encryption key is ephemeral', async () => {
    http.get.mockImplementationOnce(async () => ({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
    }));

    const { queryByText, queryByRole } = render(
      <HealthCheck http={http} docLinks={docLinks}>
        <p>{'should render'}</p>
      </HealthCheck>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    const description = queryByRole(/banner/i);
    expect(description!.textContent).toMatchInlineSnapshot(
      `"To create an alert, set a value for xpack.encryptedSavedObjects.encryptionKey in your kibana.yml file. Learn how."`
    );

    const action = queryByText(/Learn/i);
    expect(action!.textContent).toMatchInlineSnapshot(`"Learn how."`);
    expect(action!.getAttribute('href')).toMatchInlineSnapshot(
      `"elastic.co/guide/en/kibana/current/alert-action-settings-kb.html#general-alert-action-settings"`
    );
  });

  test('renders warning if encryption key is ephemeral and keys are disabled', async () => {
    http.get.mockImplementationOnce(async () => ({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: false,
    }));

    const { queryByText } = render(
      <HealthCheck http={http} docLinks={docLinks}>
        <p>{'should render'}</p>
      </HealthCheck>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    const description = queryByText(/Transport Layer Security/i);

    expect(description!.textContent).toMatchInlineSnapshot(
      `"You must enable Transport Layer Security between Kibana and Elasticsearch and configure an encryption key in your kibana.yml file. Learn how"`
    );

    const action = queryByText(/Learn/i);
    expect(action!.textContent).toMatchInlineSnapshot(`"Learn how"`);
    expect(action!.getAttribute('href')).toMatchInlineSnapshot(
      `"elastic.co/guide/en/kibana/current/alerting-getting-started.html#alerting-setup-prerequisites"`
    );
  });
});
