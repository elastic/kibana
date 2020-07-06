/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/react_router_history.mock';

import React from 'react';
import { act } from 'react-dom/test-utils';
import { render, ReactWrapper } from 'enzyme';

import { I18nProvider } from '@kbn/i18n/react';
import { KibanaContext } from '../../../';
import { LicenseContext } from '../../../shared/licensing';
import { mountWithContext, mockKibanaContext } from '../../../__mocks__';

import { ErrorState } from '../error_state';

import { ViewContentHeader } from '../shared/view_content_header';

import { OnboardingSteps } from './onboarding_steps';
import { OrganizationStats } from './organization_stats';
import { RecentActivity } from './recent_activity';
import { Overview, defaultServerData } from './overview';

describe('Overview', () => {
  describe('non-happy-path states', () => {
    it('isLoading', () => {
      // We use render() instead of mount() here to not trigger lifecycle methods (i.e., useEffect)
      // TODO: Consider pulling this out to a renderWithContext mock/helper
      const wrapper: Cheerio = render(
        <I18nProvider>
          <KibanaContext.Provider value={{ http: {} }}>
            <LicenseContext.Provider value={{ license: {} }}>
              <Overview />
            </LicenseContext.Provider>
          </KibanaContext.Provider>
        </I18nProvider>
      );

      // render() directly renders HTML which means we have to look for selectors instead of for LoadingState directly
      expect(wrapper.find('.euiLoadingSpinner')).toHaveLength(1);
    });

    it('hasErrorConnecting', async () => {
      const wrapper = await mountWithApiMock({
        get: () => Promise.reject({ invalidPayload: true }),
      });

      expect(wrapper.find(ErrorState)).toHaveLength(1);
    });
  });

  describe('happy-path states', () => {
    it('renders onboarding state', async () => {
      const mockApi = jest.fn(() => defaultServerData);
      const wrapper = await mountWithApiMock({ get: mockApi });

      expect(wrapper.find(ViewContentHeader)).toHaveLength(1);
      expect(wrapper.find(OnboardingSteps)).toHaveLength(1);
      expect(wrapper.find(OrganizationStats)).toHaveLength(1);
      expect(wrapper.find(RecentActivity)).toHaveLength(1);
    });

    it('renders when onboarding complete', async () => {
      const obCompleteData = {
        ...defaultServerData,
        hasUsers: true,
        hasOrgSources: true,
        isOldAccount: true,
        organization: {
          name: 'foo',
          defaultOrgName: 'bar',
        },
      };

      const mockApi = jest.fn(() => obCompleteData);
      const wrapper = await mountWithApiMock({ get: mockApi });

      expect(wrapper.find(OnboardingSteps)).toHaveLength(0);
    });
  });
});

/**
 * Test helpers
 */

const mountWithApiMock = async ({ get, license }: { get(): any; license?: object }) => {
  let wrapper: ReactWrapper | undefined;
  const httpMock = { ...mockKibanaContext.http, get };

  // We get a lot of act() warning/errors in the terminal without this.
  // TBH, I don't fully understand why since Enzyme's mount is supposed to
  // have act() baked in - could be because of the wrapping context provider?
  await act(async () => {
    wrapper = mountWithContext(<Overview />, { http: httpMock, license });
  });
  if (wrapper) {
    wrapper.update(); // This seems to be required for the DOM to actually update

    return wrapper;
  } else {
    throw new Error('Could not mount wrapper');
  }
};
