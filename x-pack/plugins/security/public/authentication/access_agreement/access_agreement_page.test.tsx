/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingContent } from '@elastic/eui';
import { act } from '@testing-library/react';
import React from 'react';
import ReactMarkdown from 'react-markdown';

import { coreMock } from '@kbn/core/public/mocks';
import { findTestSubject, mountWithIntl, nextTick } from '@kbn/test-jest-helpers';

import { AccessAgreementPage } from './access_agreement_page';

describe('AccessAgreementPage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'http://some-host/bar', protocol: 'http' },
      writable: true,
    });
  });

  it('renders as expected when state is available', async () => {
    const coreStartMock = coreMock.createStart();
    coreStartMock.http.get.mockResolvedValue({ accessAgreement: 'This is [link](../link)' });

    const wrapper = mountWithIntl(
      <AccessAgreementPage
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        fatalErrors={coreStartMock.fatalErrors}
      />
    );

    expect(wrapper.exists(EuiLoadingContent)).toBe(true);
    expect(wrapper.exists(ReactMarkdown)).toBe(false);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(ReactMarkdown)).toMatchSnapshot();
    expect(wrapper.exists(EuiLoadingContent)).toBe(false);

    expect(coreStartMock.http.get).toHaveBeenCalledTimes(1);
    expect(coreStartMock.http.get).toHaveBeenCalledWith(
      '/internal/security/access_agreement/state'
    );
    expect(coreStartMock.fatalErrors.add).not.toHaveBeenCalled();
  });

  it('fails when state is not available', async () => {
    const coreStartMock = coreMock.createStart();
    const error = Symbol();
    coreStartMock.http.get.mockRejectedValue(error);

    const wrapper = mountWithIntl(
      <AccessAgreementPage
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        fatalErrors={coreStartMock.fatalErrors}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(coreStartMock.http.get).toHaveBeenCalledTimes(1);
    expect(coreStartMock.http.get).toHaveBeenCalledWith(
      '/internal/security/access_agreement/state'
    );
    expect(coreStartMock.fatalErrors.add).toHaveBeenCalledTimes(1);
    expect(coreStartMock.fatalErrors.add).toHaveBeenCalledWith(error);
  });

  it('properly redirects after successful acknowledgement', async () => {
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.get.mockResolvedValue({ accessAgreement: 'This is [link](../link)' });
    coreStartMock.http.post.mockResolvedValue(undefined);

    window.location.href = `https://some-host/security/access_agreement?next=${encodeURIComponent(
      '/some-base-path/app/kibana#/home?_g=()'
    )}`;
    const wrapper = mountWithIntl(
      <AccessAgreementPage
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        fatalErrors={coreStartMock.fatalErrors}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    findTestSubject(wrapper, 'accessAgreementAcknowledge').simulate('click');

    await act(async () => {
      await nextTick();
    });

    expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
    expect(coreStartMock.http.post).toHaveBeenCalledWith(
      '/internal/security/access_agreement/acknowledge'
    );

    expect(window.location.href).toBe('/some-base-path/app/kibana#/home?_g=()');
    expect(coreStartMock.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('shows error toast if acknowledgement fails', async () => {
    const currentURL = `https://some-host/login?next=${encodeURIComponent(
      '/some-base-path/app/kibana#/home?_g=()'
    )}`;

    const failureReason = new Error('Oh no!');
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.get.mockResolvedValue({ accessAgreement: 'This is [link](../link)' });
    coreStartMock.http.post.mockRejectedValue(failureReason);

    window.location.href = currentURL;
    const wrapper = mountWithIntl(
      <AccessAgreementPage
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        fatalErrors={coreStartMock.fatalErrors}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    findTestSubject(wrapper, 'accessAgreementAcknowledge').simulate('click');

    await act(async () => {
      await nextTick();
    });

    expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
    expect(coreStartMock.http.post).toHaveBeenCalledWith(
      '/internal/security/access_agreement/acknowledge'
    );

    expect(window.location.href).toBe(currentURL);
    expect(coreStartMock.notifications.toasts.addError).toHaveBeenCalledWith(failureReason, {
      title: 'Could not acknowledge access agreement.',
    });
  });
});
