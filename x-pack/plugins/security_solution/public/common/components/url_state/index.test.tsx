/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// /*
//  * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
//  * or more contributor license agreements. Licensed under the Elastic License
//  * 2.0; you may not use this file except in compliance with the Elastic License
//  * 2.0.
//  */

// import { mount } from 'enzyme';
// import React from 'react';

// import { HookWrapper } from '../../mock';
// import { SecurityPageName } from '../../../app/types';
// import type { RouteSpyState } from '../../utils/route/types';
// import { CONSTANTS } from './constants';
// import { getMockPropsObj, mockHistory, getMockProps } from './test_dependencies';
// import type { UrlStateContainerPropTypes } from './types';
// import { useUrlStateHooks } from './use_url_state';
// import { useLocation } from 'react-router-dom';
// import { updateAppLinks } from '../../links';
// import { links } from '../../links/app_links';
// import { allowedExperimentalValues } from '../../../../common/experimental_features';

// let mockProps: UrlStateContainerPropTypes;

// const mockRouteSpy: RouteSpyState = {
//   pageName: SecurityPageName.network,
//   detailName: undefined,
//   tabName: undefined,
//   search: '',
//   pathName: '/network',
// };
// jest.mock('../../utils/route/use_route_spy', () => ({
//   useRouteSpy: () => [mockRouteSpy],
// }));

// jest.mock('../super_date_picker', () => ({
//   formatDate: (date: string) => {
//     return '2020-01-01T00:00:00.000Z';
//   },
// }));

// jest.mock('../../lib/kibana', () => ({
//   useKibana: () => ({
//     services: {
//       data: {
//         query: {
//           filterManager: {},
//           savedQueries: {},
//         },
//       },
//     },
//   }),
//   KibanaServices: {
//     get: jest.fn(() => ({ uiSettings: { get: () => ({ from: 'now-24h', to: 'now' }) } })),
//   },
// }));

// jest.mock('react-redux', () => {
//   const original = jest.requireActual('react-redux');
//   return {
//     ...original,
//     useDispatch: () => jest.fn(),
//   };
// });

// jest.mock('react-router-dom', () => {
//   const original = jest.requireActual('react-router-dom');

//   return {
//     ...original,
//     useLocation: jest.fn(),
//   };
// });

// const mockedUseIsGroupedNavigationEnabled = jest.fn();
// jest.mock('../navigation/helpers', () => ({
//   useIsGroupedNavigationEnabled: () => mockedUseIsGroupedNavigationEnabled(),
// }));

// describe('UrlStateContainer', () => {
//   beforeAll(() => {
//     mockedUseIsGroupedNavigationEnabled.mockReturnValue(false);
//     updateAppLinks(links, {
//       experimentalFeatures: allowedExperimentalValues,
//       capabilities: {
//         navLinks: {},
//         management: {},
//         catalogue: {},
//         actions: { show: true, crud: true },
//         siem: {
//           show: true,
//           crud: true,
//         },
//       },
//     });
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//     mockedUseIsGroupedNavigationEnabled.mockReturnValue(false);
//   });

//   describe('handleInitialize', () => {
//     it("it doesn't update URL state when pathName and browserPAth are out of sync", () => {
//       mockProps = getMockPropsObj({
//         page: CONSTANTS.networkPage,
//         examplePath: '/network',
//         namespaceLower: 'network',
//         pageName: SecurityPageName.network,
//         detailName: undefined,
//       }).noSearch.undefinedQuery;

//       (useLocation as jest.Mock).mockReturnValue({
//         pathname: 'out of sync path',
//         search: mockProps.search,
//       });

//       mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

//       expect(mockHistory.replace).not.toHaveBeenCalled();
//     });

//     it("it doesn't update URL state when on admin page and grouped nav disabled", () => {
//       mockedUseIsGroupedNavigationEnabled.mockReturnValue(false);
//       mockProps = getMockPropsObj({
//         page: CONSTANTS.unknown,
//         examplePath: '/administration',
//         namespaceLower: 'administration',
//         pageName: SecurityPageName.administration,
//         detailName: undefined,
//       }).noSearch.undefinedQuery;

//       (useLocation as jest.Mock).mockReturnValue({
//         pathname: mockProps.pathName,
//         search: mockProps.search,
//       });

//       mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

//       expect(mockHistory.replace.mock.calls[0][0].search).toBe('?');
//     });

//     it("it doesn't update URL state when on admin page and grouped nav enabled", () => {
//       mockedUseIsGroupedNavigationEnabled.mockReturnValue(true);
//       mockProps = getMockPropsObj({
//         page: CONSTANTS.unknown,
//         examplePath: '/dashboards',
//         namespaceLower: 'dashboards',
//         pageName: SecurityPageName.dashboardsLanding,
//         detailName: undefined,
//       }).noSearch.undefinedQuery;

//       (useLocation as jest.Mock).mockReturnValue({
//         pathname: mockProps.pathName,
//         search: mockProps.search,
//       });

//       mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

//       expect(mockHistory.replace.mock.calls[0][0].search).toBe('?');
//     });

//     it('it removes empty timeline state from URL', () => {
//       mockProps = {
//         ...getMockProps(
//           {
//             hash: '',
//             pathname: '/network',
//             search: "?timeline=(id:'',isOpen:!t)",
//             state: '',
//           },
//           CONSTANTS.networkPage,
//           null,
//           SecurityPageName.network,
//           undefined
//         ),
//       };

//       (useLocation as jest.Mock).mockReturnValue({
//         pathname: mockProps.pathName,
//         search: mockProps.search,
//       });

//       mount(<HookWrapper hookProps={mockProps} hook={(args) => useUrlStateHooks(args)} />);

//       expect(mockHistory.replace.mock.calls[0][0].search).not.toContain('timeline=');
//     });
//   });
// });
