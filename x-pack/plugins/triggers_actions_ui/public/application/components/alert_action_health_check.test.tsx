/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from '@testing-library/react';

import { AlertActionHealthCheck } from './alert_action_health_check';

import { act } from 'react-dom/test-utils';
import { httpServiceMock } from '../../../../../../src/core/public/mocks';

const docLinks = { ELASTIC_WEBSITE_URL: 'elastic.co/', DOC_LINK_VERSION: 'current' };

const http = httpServiceMock.createStartContract();

describe('alert creation health check', () => {
  test('renders spinner while health is loading', async () => {
    http.get.mockImplementationOnce(() => new Promise(() => {}));

    const { queryByText, container } = render(
      <AlertActionHealthCheck action="creation" http={http} docLinks={docLinks}>
        <p>{'shouldnt render'}</p>
      </AlertActionHealthCheck>
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
      <AlertActionHealthCheck action="creation" http={http} docLinks={docLinks}>
        <p>{'should render'}</p>
      </AlertActionHealthCheck>
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

    const { queryAllByText, queryByTitle } = render(
      <AlertActionHealthCheck action="creation" http={http} docLinks={docLinks}>
        <p>{'should render'}</p>
      </AlertActionHealthCheck>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    const [description, action] = queryAllByText(/TLS/i);
    expect(description.textContent).toMatchInlineSnapshot(
      `"Alert creation requires TLS between Elasticsearch and Kibana."`
    );

    expect(action.textContent).toMatchInlineSnapshot(`"enable TLS"`);

    const actionLink = queryByTitle(action.textContent!);
    expect(actionLink!.getAttribute('href')).toMatchInlineSnapshot(
      `"elastic.co/guide/en/kibana/current/configuring-tls.html"`
    );
  });

  test('renders warning if encryption key is ephemeral', async () => {
    http.get.mockImplementationOnce(async () => ({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: false,
    }));

    const { queryAllByText, queryByTitle } = render(
      <AlertActionHealthCheck action="creation" http={http} docLinks={docLinks}>
        <p>{'should render'}</p>
      </AlertActionHealthCheck>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    const [description, action] = queryAllByText(/Encryption/i);

    expect(description.textContent).toMatchInlineSnapshot(
      `"Alert creation requires a permanent Encryption Key."`
    );

    expect(action.textContent).toMatchInlineSnapshot(`"Configure an Encryption Key"`);

    const actionLink = queryByTitle(action.textContent!);
    expect(actionLink!.getAttribute('href')).toMatchInlineSnapshot(
      `"elastic.co/guide/en/kibana/current/alert-action-settings-kb.html#general-alert-action-settings"`
    );
  });

  test('renders warning if encryption key is ephemeral and keys are disabled', async () => {
    http.get.mockImplementationOnce(async () => ({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: false,
    }));

    const { queryAllByText, queryByTitle } = render(
      <AlertActionHealthCheck action="creation" http={http} docLinks={docLinks}>
        <p>{'should render'}</p>
      </AlertActionHealthCheck>
    );
    await act(async () => {
      // wait for useEffect to run
    });

    const [description, action] = queryAllByText(/TLS/i);

    expect(description.textContent).toMatchInlineSnapshot(
      `"Alert creation requires TLS between Elasticsearch and Kibana, and a permanent Encryption Key."`
    );

    expect(action.textContent).toMatchInlineSnapshot(
      `"enable TLS and configure an Encryption Key"`
    );

    const actionLink = queryByTitle(action.textContent!);
    expect(actionLink!.getAttribute('href')).toMatchInlineSnapshot(
      `"elastic.co/guide/en/kibana/current/alerting-getting-started.html#alerting-setup-prerequisites"`
    );
  });
});
