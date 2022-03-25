/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { KibanaPageTemplateProps } from '../../../../../../../../src/plugins/kibana_react/public';
import { useKibana } from '../../../lib/kibana/kibana_react';
import { useGetUserCasesPermissions } from '../../../lib/kibana';
import { SecurityPageName } from '../../../../app/types';
import { useSecuritySolutionNavigation } from '.';
import { CONSTANTS } from '../../url_state/constants';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { UrlInputsModel } from '../../../store/inputs/model';
import { useRouteSpy } from '../../../utils/route/use_route_spy';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';
import { TestProviders } from '../../../mock';
import { CASES_FEATURE_ID } from '../../../../../common/constants';
import { useCanSeeHostIsolationExceptionsMenu } from '../../../../management/pages/host_isolation_exceptions/view/hooks';

jest.mock('../../../lib/kibana/kibana_react');
jest.mock('../../../lib/kibana');
jest.mock('../../../hooks/use_selector');
jest.mock('../../../hooks/use_experimental_features');
jest.mock('../../../utils/route/use_route_spy');
jest.mock('../../../../management/pages/host_isolation_exceptions/view/hooks');

describe('useSecuritySolutionNavigation', () => {
  const mockUrlState = {
    [CONSTANTS.appQuery]: { query: 'host.name:"security-solution-es"', language: 'kuery' },
    [CONSTANTS.savedQuery]: '',
    [CONSTANTS.sourcerer]: {},
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

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "icon": "logoSecurity",
        "items": Array [
          Object {
            "id": "main",
            "items": Array [
              Object {
                "data-href": "securitySolutionUI/overview?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-overview",
                "disabled": false,
                "href": "securitySolutionUI/overview?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "overview",
                "isSelected": false,
                "name": "Overview",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolutionUI/get_started?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-get_started",
                "disabled": false,
                "href": "securitySolutionUI/get_started?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "get_started",
                "isSelected": false,
                "name": "Getting started",
                "onClick": [Function],
              },
            ],
            "name": "",
          },
          Object {
            "id": "detect",
            "items": Array [
              Object {
                "data-href": "securitySolutionUI/alerts?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-alerts",
                "disabled": false,
                "href": "securitySolutionUI/alerts?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "alerts",
                "isSelected": false,
                "name": "Alerts",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolutionUI/rules?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-rules",
                "disabled": false,
                "href": "securitySolutionUI/rules?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "rules",
                "isSelected": false,
                "name": "Rules",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolutionUI/exceptions?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-exceptions",
                "disabled": false,
                "href": "securitySolutionUI/exceptions?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "exceptions",
                "isSelected": false,
                "name": "Exception lists",
                "onClick": [Function],
              },
            ],
            "name": "Detect",
          },
          Object {
            "id": "explore",
            "items": Array [
              Object {
                "data-href": "securitySolutionUI/hosts?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-hosts",
                "disabled": false,
                "href": "securitySolutionUI/hosts?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "hosts",
                "isSelected": true,
                "name": "Hosts",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolutionUI/network?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-network",
                "disabled": false,
                "href": "securitySolutionUI/network?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "network",
                "isSelected": false,
                "name": "Network",
                "onClick": [Function],
              },
            ],
            "name": "Explore",
          },
          Object {
            "id": "investigate",
            "items": Array [
              Object {
                "data-href": "securitySolutionUI/timelines?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-timelines",
                "disabled": false,
                "href": "securitySolutionUI/timelines?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "timelines",
                "isSelected": false,
                "name": "Timelines",
                "onClick": [Function],
              },
            ],
            "name": "Investigate",
          },
          Object {
            "id": "manage",
            "items": Array [
              Object {
                "data-href": "securitySolutionUI/endpoints",
                "data-test-subj": "navigation-endpoints",
                "disabled": false,
                "href": "securitySolutionUI/endpoints",
                "id": "endpoints",
                "isSelected": false,
                "name": "Endpoints",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolutionUI/trusted_apps",
                "data-test-subj": "navigation-trusted_apps",
                "disabled": false,
                "href": "securitySolutionUI/trusted_apps",
                "id": "trusted_apps",
                "isSelected": false,
                "name": "Trusted applications",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolutionUI/event_filters",
                "data-test-subj": "navigation-event_filters",
                "disabled": false,
                "href": "securitySolutionUI/event_filters",
                "id": "event_filters",
                "isSelected": false,
                "name": "Event filters",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolutionUI/host_isolation_exceptions",
                "data-test-subj": "navigation-host_isolation_exceptions",
                "disabled": false,
                "href": "securitySolutionUI/host_isolation_exceptions",
                "id": "host_isolation_exceptions",
                "isSelected": false,
                "name": "Host isolation exceptions",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolutionUI/blocklist",
                "data-test-subj": "navigation-blocklist",
                "disabled": false,
                "href": "securitySolutionUI/blocklist",
                "id": "blocklist",
                "isSelected": false,
                "name": "Blocklist",
                "onClick": [Function],
              },
            ],
            "name": "Manage",
          },
        ],
        "name": "Security",
      }
    `);
  });

  // TODO: Steph/users remove when no longer experimental
  it('should include users when feature flag is on', async () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
      () => useSecuritySolutionNavigation(),
      { wrapper: TestProviders }
    );

    expect(result?.current?.items?.[2].items?.[2].id).toEqual(SecurityPageName.users);
  });

  // TODO: Sergi/detectionAndResponse remove when no longer experimental
  it('should include detectionAndResponse when feature flag is on', async () => {
    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
      () => useSecuritySolutionNavigation(),
      { wrapper: TestProviders }
    );
    expect(result?.current?.items?.[0].items?.[2].id).toEqual(
      SecurityPageName.detectionAndResponse
    );
  });

  it('should omit host isolation exceptions if hook reports false', () => {
    (useCanSeeHostIsolationExceptionsMenu as jest.Mock).mockReturnValueOnce(false);
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(
      () => useSecuritySolutionNavigation(),
      { wrapper: TestProviders }
    );
    expect(
      result.current?.items
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

        const caseNavItem = (result.current?.items || [])[3].items?.find(
          (item) => item['data-test-subj'] === 'navigation-cases'
        );
        expect(caseNavItem).toMatchInlineSnapshot(`
          Object {
            "data-href": "securitySolutionUI/cases?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
            "data-test-subj": "navigation-cases",
            "disabled": false,
            "href": "securitySolutionUI/cases?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
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
