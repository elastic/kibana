/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';

import { coreMock } from 'src/core/public/mocks';

import { createRedirectLegacyUrl } from './redirect_legacy_url';

const APP_ID = 'testAppId';

describe('#redirectLegacyUrl', () => {
  const setup = () => {
    const { getStartServices } = coreMock.createSetup();
    const startServices = coreMock.createStart();
    const subject = new BehaviorSubject<string>(`not-${APP_ID}`);
    subject.next(APP_ID); // test below asserts that the consumer received the most recent APP_ID
    startServices.application.currentAppId$ = subject;
    const toasts = startServices.notifications.toasts;
    const application = startServices.application;
    getStartServices.mockResolvedValue([startServices, , ,]);

    const redirectLegacyUrl = createRedirectLegacyUrl(getStartServices);

    return { redirectLegacyUrl, toasts, application };
  };

  it('redirects to the given path in the current app and creates a toast when aliasPurpose is "savedObjectConversion"', async () => {
    const { redirectLegacyUrl, toasts, application } = setup();

    const path = '/foo?bar#baz';
    await redirectLegacyUrl({ path, aliasPurpose: 'savedObjectConversion' });

    expect(toasts.addInfo).toHaveBeenCalledTimes(1);
    expect(application.navigateToApp).toHaveBeenCalledTimes(1);
    expect(application.navigateToApp).toHaveBeenCalledWith(APP_ID, { replace: true, path });
  });

  it('redirects to the given path in the current app and does not create a toast when aliasPurpose is not "savedObjectConversion"', async () => {
    const { redirectLegacyUrl, toasts, application } = setup();

    const path = '/foo?bar#baz';
    await redirectLegacyUrl({ path, aliasPurpose: undefined });
    await redirectLegacyUrl({ path, aliasPurpose: 'savedObjectImport' });

    expect(toasts.addInfo).not.toHaveBeenCalled();
    expect(application.navigateToApp).toHaveBeenCalledTimes(2);
    expect(application.navigateToApp).toHaveBeenCalledWith(APP_ID, { replace: true, path });
  });
});
