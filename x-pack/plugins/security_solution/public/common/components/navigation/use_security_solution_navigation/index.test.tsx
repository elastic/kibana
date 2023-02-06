/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template';
import { useKibana } from '../../../lib/kibana/kibana_react';
import { useGetUserCasesPermissions } from '../../../lib/kibana';
import { SecurityPageName } from '../../../../app/types';
import { useSecuritySolutionNavigation } from '.';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import { TestProviders } from '../../../mock';
import { CASES_FEATURE_ID } from '../../../../../common/constants';
import { useTourContext } from '../../guided_onboarding_tour';
import { useUserPrivileges } from '../../user_privileges';
import {
  noCasesPermissions,
  readCasesCapabilities,
  readCasesPermissions,
} from '../../../../cases_test_utils';
import { mockCasesContract } from '@kbn/cases-plugin/public/mocks';
import { getEndpointAuthzInitialStateMock } from '../../../../../common/endpoint/service/authz/mocks';
import { getUserPrivilegesMockDefaultValue } from '../../user_privileges/__mocks__';

jest.mock('../../../lib/kibana/kibana_react');
jest.mock('../../../lib/kibana');
const originalKibanaLib = jest.requireActual('../../../lib/kibana');

// Restore the useGetUserCasesPermissions so the calling functions can receive a valid permissions object
// The returned permissions object will indicate that the user does not have permissions by default
const mockUseGetUserCasesPermissions = useGetUserCasesPermissions as jest.Mock;
mockUseGetUserCasesPermissions.mockImplementation(originalKibanaLib.useGetUserCasesPermissions);

jest.mock('../../../hooks/use_selector');
jest.mock('../../../hooks/use_experimental_features');
jest.mock('../../../utils/route/use_route_spy');
jest.mock('../../guided_onboarding_tour');
jest.mock('../../user_privileges');

const mockUseUserPrivileges = useUserPrivileges as jest.Mock;

describe('useSecuritySolutionNavigation', () => {
  const mockRouteSpy = [
    {
      detailName: '',
      flowTarget: '',
      pathName: '',
      search: '',
      state: '',
      tabName: '',
      pageName: SecurityPageName.hosts,
    },
  ];

  beforeEach(() => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
    (useRouteSpy as jest.Mock).mockReturnValue(mockRouteSpy);
    mockUseUserPrivileges.mockImplementation(getUserPrivilegesMockDefaultValue);
    (useTourContext as jest.Mock).mockReturnValue({ isTourShown: false });

    const cases = mockCasesContract();
    cases.helpers.getUICapabilities.mockReturnValue(readCasesPermissions());

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases,
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: (appId: string, options?: { path?: string; deepLinkId?: boolean }) =>
            `${appId}/${options?.deepLinkId ?? ''}${options?.path ?? ''}`,
          capabilities: {
            siem: {
              show: true,
              crud: true,
            },
            [CASES_FEATURE_ID]: readCasesCapabilities(),
          },
        },
        chrome: {
          setBreadcrumbs: jest.fn(),
        },
      },
    });
  });

  afterEach(() => {
    mockUseUserPrivileges.mockReset();
  });

  it('should create navigation config', async () => {
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
      () => useSecuritySolutionNavigation(),
      { wrapper: TestProviders }
    );

    expect(result.current).toMatchSnapshot();
  });

  // TODO: [kubernetes] remove when no longer experimental
  it('should include kubernetes when feature flag is on', async () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
      () => useSecuritySolutionNavigation(),
      { wrapper: TestProviders }
    );
    expect(result?.current?.items?.[1].items?.[4].id).toEqual(SecurityPageName.kubernetes);
  });

  it('should omit host isolation exceptions if no authz', () => {
    mockUseUserPrivileges.mockImplementation(() => ({
      endpointPrivileges: getEndpointAuthzInitialStateMock({
        canReadHostIsolationExceptions: false,
      }),
    }));
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
      () => useSecuritySolutionNavigation(),
      { wrapper: TestProviders }
    );
    const items = result.current?.items;
    expect(items).toBeDefined();
    expect(
      items!
        .find((item) => item.id === 'manage')
        ?.items?.find((item) => item.id === 'host_isolation_exceptions')
    ).toBeUndefined();
  });

  it('should omit response actions history if hook reports false', () => {
    mockUseUserPrivileges.mockImplementation(() => ({
      endpointPrivileges: getEndpointAuthzInitialStateMock({ canReadActionsLogManagement: false }),
    }));
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
      () => useSecuritySolutionNavigation(),
      { wrapper: TestProviders }
    );
    const items = result.current?.items;
    expect(items).toBeDefined();
    expect(
      items!
        .find((item) => item.id === 'manage')
        ?.items?.find((item) => item.id === 'response_actions_history')
    ).toBeUndefined();
  });

  describe('Permission gated routes', () => {
    describe('cases', () => {
      it('should display the cases navigation item when the user has read permissions', () => {
        (useGetUserCasesPermissions as jest.Mock).mockReturnValue(readCasesPermissions());

        const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
          () => useSecuritySolutionNavigation(),
          { wrapper: TestProviders }
        );

        const caseNavItem = (result.current?.items || [])[6].items?.find(
          (item) => item['data-test-subj'] === 'navigation-cases'
        );
        expect(caseNavItem).toMatchInlineSnapshot(`
          Object {
            "data-href": "securitySolutionUI/cases",
            "data-test-subj": "navigation-cases",
            "disabled": false,
            "href": "securitySolutionUI/cases",
            "id": "cases",
            "isSelected": false,
            "name": "Cases",
            "onClick": [Function],
          }
        `);
      });

      it('should not display the cases navigation item when the user does not have read permissions', () => {
        (useGetUserCasesPermissions as jest.Mock).mockReturnValue(noCasesPermissions());

        const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
          () => useSecuritySolutionNavigation(),
          { wrapper: TestProviders }
        );

        const caseNavItem = (result.current?.items || [])[3].items?.find(
          (item) => item['data-test-subj'] === 'navigation-cases'
        );
        expect(caseNavItem).toBeFalsy();
      });
    });
  });
});
