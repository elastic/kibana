/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { coreMock } from 'src/core/public/mocks';
import { BehaviorSubject } from 'rxjs';
import { ILicense } from '../../../licensing/public';
import { SecurityNavControlService } from '.';
import { SecurityLicenseService } from '../../common/licensing';
import { nextTick } from 'test_utils/enzyme_helpers';
import { securityMock } from '../mocks';
import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';

const validLicense = {
  isAvailable: true,
  getFeature: feature => {
    expect(feature).toEqual('security');

    return {
      isAvailable: true,
      isEnabled: true,
    };
  },
  hasAtLeast: (...candidates) => true,
} as ILicense;

describe('SecurityNavControlService', () => {
  it('can render and cleanup the control via the mount() function', async () => {
    const license$ = new BehaviorSubject<ILicense>(validLicense);

    const navControlService = new SecurityNavControlService();
    const mockSecuritySetup = securityMock.createSetup();
    mockSecuritySetup.authc.getCurrentUser.mockResolvedValue(
      mockAuthenticatedUser({ username: 'some-user', full_name: undefined })
    );
    navControlService.setup({
      securityLicense: new SecurityLicenseService().setup({ license$ }).license,
      authc: mockSecuritySetup.authc,
    });

    const coreStart = coreMock.createStart();
    coreStart.chrome.navControls.registerRight = jest.fn();

    navControlService.start({ core: coreStart });
    expect(coreStart.chrome.navControls.registerRight).toHaveBeenCalledTimes(1);
    const [{ mount }] = coreStart.chrome.navControls.registerRight.mock.calls[0];

    const target = document.createElement('div');
    const cleanup = mount(target);

    await nextTick();

    expect(target).toMatchInlineSnapshot(`
      <div>
        <div
          class="euiPopover euiPopover--anchorDownRight"
          id="headerUserMenu"
        >
          <div
            class="euiPopover__anchor"
          >
            <button
              aria-controls="headerUserMenu"
              aria-expanded="false"
              aria-haspopup="true"
              aria-label="Account menu"
              class="euiHeaderSectionItem__button"
              data-test-subj="userMenuButton"
              type="button"
            >
              <div
                aria-label="some-user"
                class="euiAvatar euiAvatar--s euiAvatar--user"
                style="background-image: none; background-color: rgb(255, 126, 98); color: rgb(0, 0, 0);"
                title="some-user"
              >
                <span
                  aria-hidden="true"
                >
                  s
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    `);

    cleanup();

    expect(target).toMatchInlineSnapshot(`<div />`);
  });

  it('should register the nav control once the license supports it', () => {
    const license$ = new BehaviorSubject<ILicense>({} as ILicense);

    const navControlService = new SecurityNavControlService();
    navControlService.setup({
      securityLicense: new SecurityLicenseService().setup({ license$ }).license,
      authc: securityMock.createSetup().authc,
    });

    const coreStart = coreMock.createStart();
    navControlService.start({ core: coreStart });

    expect(coreStart.chrome.navControls.registerRight).not.toHaveBeenCalled();

    license$.next(validLicense);

    expect(coreStart.chrome.navControls.registerRight).toHaveBeenCalled();
  });

  it('should not register the nav control for anonymous paths', () => {
    const license$ = new BehaviorSubject<ILicense>(validLicense);

    const navControlService = new SecurityNavControlService();
    navControlService.setup({
      securityLicense: new SecurityLicenseService().setup({ license$ }).license,
      authc: securityMock.createSetup().authc,
    });

    const coreStart = coreMock.createStart();
    coreStart.http.anonymousPaths.isAnonymous.mockReturnValue(true);
    navControlService.start({ core: coreStart });

    expect(coreStart.chrome.navControls.registerRight).not.toHaveBeenCalled();
  });

  it('should only register the nav control once', () => {
    const license$ = new BehaviorSubject<ILicense>(validLicense);

    const navControlService = new SecurityNavControlService();
    navControlService.setup({
      securityLicense: new SecurityLicenseService().setup({ license$ }).license,
      authc: securityMock.createSetup().authc,
    });

    const coreStart = coreMock.createStart();
    navControlService.start({ core: coreStart });

    expect(coreStart.chrome.navControls.registerRight).toHaveBeenCalledTimes(1);

    // trigger license change
    license$.next({} as ILicense);
    license$.next(validLicense);

    expect(coreStart.chrome.navControls.registerRight).toHaveBeenCalledTimes(1);
  });

  it('should allow for re-registration if the service is restarted', () => {
    const license$ = new BehaviorSubject<ILicense>(validLicense);

    const navControlService = new SecurityNavControlService();
    navControlService.setup({
      securityLicense: new SecurityLicenseService().setup({ license$ }).license,
      authc: securityMock.createSetup().authc,
    });

    const coreStart = coreMock.createStart();
    navControlService.start({ core: coreStart });

    expect(coreStart.chrome.navControls.registerRight).toHaveBeenCalledTimes(1);

    navControlService.stop();

    navControlService.start({ core: coreStart });
    expect(coreStart.chrome.navControls.registerRight).toHaveBeenCalledTimes(2);
  });
});
