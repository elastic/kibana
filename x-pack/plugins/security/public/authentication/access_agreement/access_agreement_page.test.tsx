/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from '@testing-library/react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { findTestSubject } from 'test_utils/find_test_subject';
import { coreMock } from '../../../../../../src/core/public/mocks';
import { AuthenticationStatePage } from '../components/authentication_state_page';
import { AccessNoticePage } from './access_notice_page';

describe('AccessNoticePage', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: { href: 'http://some-host/bar', protocol: 'http' },
      writable: true,
    });
  });

  afterAll(() => {
    delete (window as any).location;
  });

  it('renders as expected when state is available', async () => {
    const coreStartMock = coreMock.createStart();
    coreStartMock.http.get.mockResolvedValue({ accessNotice: 'This is [link](../link)' });

    const wrapper = mountWithIntl(
      <AccessNoticePage
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        fatalErrors={coreStartMock.fatalErrors}
      />
    );

    // Shouldn't render anything if state isn't yet available.
    expect(wrapper.isEmptyRender()).toBe(true);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(AuthenticationStatePage)).toMatchSnapshot();
    expect(coreStartMock.http.get).toHaveBeenCalledTimes(1);
    expect(coreStartMock.http.get).toHaveBeenCalledWith('/internal/security/access_notice/state');
    expect(coreStartMock.fatalErrors.add).not.toHaveBeenCalled();
  });

  it('fails when state is not available', async () => {
    const coreStartMock = coreMock.createStart();
    const error = Symbol();
    coreStartMock.http.get.mockRejectedValue(error);

    const wrapper = mountWithIntl(
      <AccessNoticePage
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
    expect(coreStartMock.http.get).toHaveBeenCalledWith('/internal/security/access_notice/state');
    expect(coreStartMock.fatalErrors.add).toHaveBeenCalledTimes(1);
    expect(coreStartMock.fatalErrors.add).toHaveBeenCalledWith(error);
  });

  it('properly redirects after successful acknowledgement', async () => {
    const coreStartMock = coreMock.createStart({ basePath: '/some-base-path' });
    coreStartMock.http.get.mockResolvedValue({ accessNotice: 'This is [link](../link)' });
    coreStartMock.http.post.mockResolvedValue(undefined);

    window.location.href = `https://some-host/security/access_notice?next=${encodeURIComponent(
      '/some-base-path/app/kibana#/home?_g=()'
    )}`;
    const wrapper = mountWithIntl(
      <AccessNoticePage
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        fatalErrors={coreStartMock.fatalErrors}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    findTestSubject(wrapper, 'accessNoticeAcknowledge').simulate('click');

    await act(async () => {
      await nextTick();
    });

    expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
    expect(coreStartMock.http.post).toHaveBeenCalledWith(
      '/internal/security/access_notice/acknowledge'
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
    coreStartMock.http.get.mockResolvedValue({ accessNotice: 'This is [link](../link)' });
    coreStartMock.http.post.mockRejectedValue(failureReason);

    window.location.href = currentURL;
    const wrapper = mountWithIntl(
      <AccessNoticePage
        http={coreStartMock.http}
        notifications={coreStartMock.notifications}
        fatalErrors={coreStartMock.fatalErrors}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    findTestSubject(wrapper, 'accessNoticeAcknowledge').simulate('click');

    await act(async () => {
      await nextTick();
    });

    expect(coreStartMock.http.post).toHaveBeenCalledTimes(1);
    expect(coreStartMock.http.post).toHaveBeenCalledWith(
      '/internal/security/access_notice/acknowledge'
    );

    expect(window.location.href).toBe(currentURL);
    expect(coreStartMock.notifications.toasts.addError).toHaveBeenCalledWith(failureReason, {
      title: 'Could not acknowledge access notice.',
    });
  });
});
