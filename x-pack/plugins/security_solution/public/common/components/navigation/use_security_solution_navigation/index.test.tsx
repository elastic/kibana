/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { KibanaPageTemplateProps } from '../../../../../../../../src/plugins/kibana_react/public';
import { useGetUserCasesPermissions, useKibana } from '../../../lib/kibana';
import { SecurityPageName } from '../../../../app/types';
import { useSecuritySolutionNavigation } from '.';
import { CONSTANTS } from '../../url_state/constants';
import { TimelineTabs } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { UrlInputsModel } from '../../../store/inputs/model';
import { useRouteSpy } from '../../../utils/route/use_route_spy';

jest.mock('../../../lib/kibana');
jest.mock('../../../hooks/use_selector');
jest.mock('../../../utils/route/use_route_spy');

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
    (useDeepEqualSelector as jest.Mock).mockReturnValue({ urlState: mockUrlState });
    (useRouteSpy as jest.Mock).mockReturnValue(mockRouteSpy);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: (appId: string, options?: { path?: string; absolute?: boolean }) =>
            `${appId}${options?.path ?? ''}`,
        },
        chrome: {
          setBreadcrumbs: jest.fn(),
        },
      },
    });
  });

  it('should create navigation config', async () => {
    const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(() =>
      useSecuritySolutionNavigation()
    );

    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "icon": "logoSecurity",
        "items": Array [
          Object {
            "id": "securitySolution",
            "items": Array [
              Object {
                "data-href": "securitySolution:overview?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-overview",
                "disabled": false,
                "href": "securitySolution:overview?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "overview",
                "isSelected": false,
                "name": "Overview",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolution:detections?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-detections",
                "disabled": false,
                "href": "securitySolution:detections?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "detections",
                "isSelected": false,
                "name": "Detections",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolution:hosts?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-hosts",
                "disabled": false,
                "href": "securitySolution:hosts?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "hosts",
                "isSelected": true,
                "name": "Hosts",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolution:network?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-network",
                "disabled": false,
                "href": "securitySolution:network?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "network",
                "isSelected": false,
                "name": "Network",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolution:timelines?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "data-test-subj": "navigation-timelines",
                "disabled": false,
                "href": "securitySolution:timelines?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
                "id": "timelines",
                "isSelected": false,
                "name": "Timelines",
                "onClick": [Function],
              },
              Object {
                "data-href": "securitySolution:administration",
                "data-test-subj": "navigation-administration",
                "disabled": false,
                "href": "securitySolution:administration",
                "id": "administration",
                "isSelected": false,
                "name": "Administration",
                "onClick": [Function],
              },
            ],
            "name": "",
          },
        ],
        "name": "Security",
      }
    `);
  });

  describe('Permission gated routes', () => {
    describe('cases', () => {
      it('should display the cases navigation item when the user has read permissions', () => {
        (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
          crud: true,
          read: true,
        });

        const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(() =>
          useSecuritySolutionNavigation()
        );

        const caseNavItem = (result.current?.items || [])[0].items?.find(
          (item) => item['data-test-subj'] === 'navigation-case'
        );
        expect(caseNavItem).toMatchInlineSnapshot(`
          Object {
            "data-href": "securitySolution:case?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
            "data-test-subj": "navigation-case",
            "disabled": false,
            "href": "securitySolution:case?query=(language:kuery,query:'host.name:%22security-solution-es%22')&sourcerer=()&timerange=(global:(linkTo:!(timeline),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)),timeline:(linkTo:!(global),timerange:(from:'2020-07-07T08:20:18.966Z',fromStr:now-24h,kind:relative,to:'2020-07-08T08:20:18.966Z',toStr:now)))",
            "id": "case",
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

        const { result } = renderHook<{}, KibanaPageTemplateProps['solutionNav']>(() =>
          useSecuritySolutionNavigation()
        );

        const caseNavItem = (result.current?.items || [])[0].items?.find(
          (item) => item['data-test-subj'] === 'navigation-case'
        );
        expect(caseNavItem).toBeFalsy();
      });
    });
  });
});
