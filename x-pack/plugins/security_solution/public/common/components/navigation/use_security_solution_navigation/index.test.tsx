/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import type { KibanaPageTemplateProps } from '@kbn/shared-ux-components';
import { useKibana } from '../../../lib/kibana/kibana_react';
import { useGetUserCasesPermissions } from '../../../lib/kibana';
import { SecurityPageName } from '../../../../app/types';
import { useSecuritySolutionNavigation } from '.';
import { CONSTANTS } from '../../url_state/constants';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import type { UrlInputsModel } from '../../../store/inputs/model';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import { TestProviders } from '../../../mock';
import { CASES_FEATURE_ID } from '../../../../../common/constants';
import { useCanSeeHostIsolationExceptionsMenu } from '../../../../management/pages/host_isolation_exceptions/view/hooks';

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
jest.mock('../../../../management/pages/host_isolation_exceptions/view/hooks');

describe('useSecuritySolutionNavigation', () => {
  const mockUrlState = {
    [CONSTANTS.timeline]: {
      activeTab: TimelineTabs.query,
      id: '',
      isOpen: false,
      graphEventId: '',
    },
    [CONSTANTS.timerange]: {
      global: {
        [CONSTANTS.timerange]: {
          from: '2020-07-07T08:20:18.966Z',
          fromStr: 'now-24h',
          kind: 'relative',
          to: '2020-07-08T08:20:18.966Z',
          toStr: 'now',
        },
        linkTo: ['timeline'],
      },
      timeline: {
        [CONSTANTS.timerange]: {
          from: '2020-07-07T08:20:18.966Z',
          fromStr: 'now-24h',
          kind: 'relative',
          to: '2020-07-08T08:20:18.966Z',
          toStr: 'now',
        },
        linkTo: ['global'],
      },
    } as UrlInputsModel,
  };

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
    (useDeepEqualSelector as jest.Mock).mockReturnValue({ urlState: mockUrlState });
    (useRouteSpy as jest.Mock).mockReturnValue(mockRouteSpy);
    (useCanSeeHostIsolationExceptionsMenu as jest.Mock).mockReturnValue(true);

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: (appId: string, options?: { path?: string; deepLinkId?: boolean }) =>
            `${appId}/${options?.deepLinkId ?? ''}${options?.path ?? ''}`,
          capabilities: {
            siem: {
              show: true,
              crud: true,
            },
            [CASES_FEATURE_ID]: { read_cases: true, crud_cases: false },
          },
        },
        chrome: {
          setBreadcrumbs: jest.fn(),
        },
      },
    });
  });

  it('should create navigation config', async () => {
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
      () => useSecuritySolutionNavigation(),
      { wrapper: TestProviders }
    );

    expect(result.current).toMatchSnapshot();
  });

  // TODO: Steph/users remove when no longer experimental
  it('should include users when feature flag is on', async () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
      () => useSecuritySolutionNavigation(),
      { wrapper: TestProviders }
    );

    expect(result?.current?.items?.[3].items?.[2].id).toEqual(SecurityPageName.users);
  });

  // TODO: [kubernetes] remove when no longer experimental
  it('should include kubernetes when feature flag is on', async () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
      () => useSecuritySolutionNavigation(),
      { wrapper: TestProviders }
    );
    expect(result?.current?.items?.[1].items?.[2].id).toEqual(SecurityPageName.kubernetes);
  });

  it('should omit host isolation exceptions if hook reports false', () => {
    (useCanSeeHostIsolationExceptionsMenu as jest.Mock).mockReturnValue(false);
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

  describe('Permission gated routes', () => {
    describe('cases', () => {
      it('should display the cases navigation item when the user has read permissions', () => {
        (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
          crud: true,
          read: true,
        });

        const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
          () => useSecuritySolutionNavigation(),
          { wrapper: TestProviders }
        );

        const caseNavItem = (result.current?.items || [])[4].items?.find(
          (item) => item['data-test-subj'] === 'navigation-cases'
        );
        expect(caseNavItem).toMatchInlineSnapshot(`
          Object {
            "data-href": "securitySolutionUI/cases?timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
            "data-test-subj": "navigation-cases",
            "disabled": false,
            "href": "securitySolutionUI/cases?timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
            "id": "cases",
            "isSelected": false,
            "name": "Cases",
            "onClick": [Function],
          }
        `);
      });

      it('should not display the cases navigation item when the user does not have read permissions', () => {
        (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
          crud: false,
          read: false,
        });

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
