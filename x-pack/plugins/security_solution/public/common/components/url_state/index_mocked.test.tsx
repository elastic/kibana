/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { links } from '../../links/app_links';
import { updateAppLinks } from '../../links';
import { allowedExperimentalValues } from '../../../../common/experimental_features';

jest.mock('../../lib/kibana', () => ({
  useKibana: () => ({
    services: {
      data: {
        query: {
          filterManager: {},
          savedQueries: {},
        },
      },
    },
  }),
}));

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => jest.fn(),
  };
});

const mockedUseIsGroupedNavigationEnabled = jest.fn();
jest.mock('../navigation/helpers', () => ({
  useIsGroupedNavigationEnabled: () => mockedUseIsGroupedNavigationEnabled(),
}));

describe('UrlStateContainer - lodash.throttle mocked to test update url', () => {
  beforeAll(() => {
    mockedUseIsGroupedNavigationEnabled.mockReturnValue(false);
    updateAppLinks(links, {
      experimentalFeatures: allowedExperimentalValues,
      capabilities: {
        navLinks: {},
        management: {},
        catalogue: {},
        actions: { show: true, crud: true },
        siem: {
          show: true,
          crud: true,
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  describe('componentDidUpdate', () => {
    //   test('timelineID redux state updates the url', () => {
    //     mockProps = getMockPropsObj({
    //       page: CONSTANTS.networkPage,
    //       examplePath: '/network',
    //       namespaceLower: 'network',
    //       pageName: SecurityPageName.network,
    //       detailName: undefined,
    //     }).noSearch.undefinedQuery;
    //     (useLocation as jest.Mock).mockReturnValue({
    //       pathname: mockProps.pathName,
    //       search: mockProps.search,
    //     });
    //     const wrapper = mount(
    //       <HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />
    //     );
    //     const newUrlState = {
    //       ...mockProps.urlState,
    //       timeline: { id: 'hello_timeline_id', isOpen: true },
    //     };
    //     wrapper.setProps({
    //       hookProps: { ...mockProps, urlState: newUrlState, isInitializing: false },
    //     });
    //     wrapper.update();
    //     expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
    //       hash: '',
    //       pathname: '/network',
    //       search: '?timeline=(id:hello_timeline_id,isOpen:!t)',
    //       state: '',
    //     });
    //   });
    // REWRITE REQUIRED
    // test("administration page doesn't has query string when grouped nav disabled", () => {
    //   mockedUseIsGroupedNavigationEnabled.mockReturnValue(false);
    //   mockProps = getMockPropsObj({
    //     page: CONSTANTS.networkPage,
    //     examplePath: '/network',
    //     namespaceLower: 'network',
    //     pageName: SecurityPageName.network,
    //     detailName: undefined,
    //   }).noSearch.definedQuery;
    //   const urlState = {
    //   };
    //   const updatedMockProps = {
    //     ...getMockPropsObj({
    //       ...mockProps,
    //       page: CONSTANTS.unknown,
    //       examplePath: MANAGEMENT_PATH,
    //       namespaceLower: 'administration',
    //       pageName: SecurityPageName.administration,
    //       detailName: undefined,
    //     }).noSearch.definedQuery,
    //     urlState,
    //   };
    //   (useLocation as jest.Mock).mockReturnValue({
    //     pathname: mockProps.pathName,
    //     search: mockProps.search,
    //   });
    //   const wrapper = mount(
    //     <HookWrapper
    //       hookProps={{ ...mockProps, urlState }}
    //       hook={(args) => useUrlStateHooks(args)}
    //     />
    //   );
    //   (useLocation as jest.Mock).mockReturnValue({
    //     pathname: updatedMockProps.pathName,
    //     search: mockProps.search,
    //   });
    //   wrapper.setProps({
    //     hookProps: updatedMockProps,
    //   });
    //   wrapper.update();
    //   expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
    //     hash: '',
    //     pathname: MANAGEMENT_PATH,
    //     search: mockProps.search,
    //     state: '',
    //   });
    // });
    // // REWRITE REQUIRED
    // test("dashboards page doesn't has query string when grouped nav enabled", () => {
    //   mockedUseIsGroupedNavigationEnabled.mockReturnValue(true);
    //   mockProps = getMockPropsObj({
    //     page: CONSTANTS.networkPage,
    //     examplePath: '/network',
    //     namespaceLower: 'network',
    //     pageName: SecurityPageName.network,
    //     detailName: undefined,
    //   }).noSearch.definedQuery;
    //   const urlState = {
    //     ...mockProps.urlState,
    //     [CONSTANTS.appQuery]: getFilterQuery(),
    //     [CONSTANTS.timerange]: {
    //       global: {
    //         [CONSTANTS.timerange]: {
    //           from: '2020-07-07T08:20:18.966Z',
    //           fromStr: 'now-24h',
    //           kind: 'relative',
    //           to: '2020-07-08T08:20:18.966Z',
    //           toStr: 'now',
    //         },
    //         linkTo: ['timeline'],
    //       },
    //       timeline: {
    //         [CONSTANTS.timerange]: {
    //           from: '2020-07-07T08:20:18.966Z',
    //           fromStr: 'now-24h',
    //           kind: 'relative',
    //           to: '2020-07-08T08:20:18.966Z',
    //           toStr: 'now',
    //         },
    //         linkTo: ['global'],
    //       },
    //     },
    //   };
    //   const updatedMockProps = {
    //     ...getMockPropsObj({
    //       ...mockProps,
    //       page: CONSTANTS.unknown,
    //       examplePath: DASHBOARDS_PATH,
    //       namespaceLower: 'dashboards',
    //       pageName: SecurityPageName.dashboardsLanding,
    //       detailName: undefined,
    //     }).noSearch.definedQuery,
    //     urlState,
    //   };
    //   (useLocation as jest.Mock).mockReturnValue({
    //     pathname: mockProps.pathName,
    //     search: mockProps.search,
    //   });
    //   const wrapper = mount(
    //     <HookWrapper
    //       hookProps={{ ...mockProps, urlState }}
    //       hook={(args) => useUrlStateHooks(args)}
    //     />
    //   );
    //   (useLocation as jest.Mock).mockReturnValue({
    //     pathname: updatedMockProps.pathName,
    //     search: mockProps.search,
    //   });
    //   wrapper.setProps({
    //     hookProps: updatedMockProps,
    //   });
    //   wrapper.update();
    //   expect(mockHistory.replace.mock.calls[1][0]).toStrictEqual({
    //     hash: '',
    //     pathname: DASHBOARDS_PATH,
    //     search: mockProps.search,
    //     state: '',
    //   });
    // });
  });
});
