/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { getExternalAlertLensAttributes } from './lens_attributes/common/external_alert';
import { useLensAttributes } from './use_lens_attributes';
import {
  fieldNameExistsFilter,
  getDetailsPageFilter,
  getIndexFilters,
  sourceOrDestinationIpExistsFilter,
  getNetworkDetailsPageFilter,
} from './utils';

import { filterFromSearchBar, queryFromSearchBar, wrapper } from './mocks';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';
import { useRouteSpy } from '../../utils/route/use_route_spy';
import { SecurityPageName } from '../../../app/types';
import { getEventsHistogramLensAttributes } from './lens_attributes/common/events';

jest.mock('../../../sourcerer/containers');
jest.mock('../../utils/route/use_route_spy', () => ({
  useRouteSpy: jest.fn(),
}));

describe('useLensAttributes', () => {
  beforeEach(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      dataViewId: 'security-solution-default',
      indicesExist: true,
      selectedPatterns: ['auditbeat-*'],
      sourcererDataView: {},
    });
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: 'mockHost',
        pageName: 'hosts',
        tabName: 'events',
      },
    ]);
  });

  it('should add query', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.query).toEqual(queryFromSearchBar);
  });

  it('should add correct filters - host details', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes().state.filters,
      ...getDetailsPageFilter('hosts', 'mockHost'),
      ...fieldNameExistsFilter('hosts'),
      ...getIndexFilters(['auditbeat-*']),
      ...filterFromSearchBar,
    ]);
  });

  it('should add correct filters - network details', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: '192.168.1.1',
        pageName: 'network',
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes().state.filters,
      ...getNetworkDetailsPageFilter('192.168.1.1'),
      ...sourceOrDestinationIpExistsFilter,
      ...getIndexFilters(['auditbeat-*']),
      ...filterFromSearchBar,
    ]);
  });

  it('should add correct filters - user details', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: 'elastic',
        pageName: 'user',
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes().state.filters,
      ...getDetailsPageFilter('user', 'elastic'),
      ...getIndexFilters(['auditbeat-*']),
      ...filterFromSearchBar,
    ]);
  });

  it('should not apply global queries and filters - applyGlobalQueriesAndFilters = false', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: undefined,
        pageName: SecurityPageName.entityAnalytics,
        tabName: undefined,
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          applyGlobalQueriesAndFilters: false,
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.query.query).toEqual('');

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes().state.filters,
      ...getIndexFilters(['auditbeat-*']),
    ]);
  });

  it('should not apply tabs and pages when applyPageAndTabsFilters = false', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      {
        detailName: 'elastic',
        pageName: 'user',
        tabName: 'events',
      },
    ]);
    const { result } = renderHook(
      () =>
        useLensAttributes({
          applyPageAndTabsFilters: false,
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.state.filters).toEqual([
      ...getExternalAlertLensAttributes().state.filters,
      ...getIndexFilters(['auditbeat-*']),
      ...filterFromSearchBar,
    ]);
  });

  it('should add data view id to references', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current?.references).toEqual([
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-current-indexpattern',
      },
      {
        type: 'index-pattern',
        id: 'security-solution-default',
        name: 'indexpattern-datasource-layer-a3c54471-615f-4ff9-9fda-69b5b2ea3eef',
      },
      {
        type: 'index-pattern',
        name: '723c4653-681b-4105-956e-abef287bf025',
        id: 'security-solution-default',
      },
      {
        type: 'index-pattern',
        name: 'a04472fc-94a3-4b8d-ae05-9d30ea8fbd6a',
        id: 'security-solution-default',
      },
    ]);
  });

  it('should not set splitAccessor if stackByField is undefined', () => {
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getEventsHistogramLensAttributes,
          stackByField: undefined,
        }),
      { wrapper }
    );

    expect(result?.current?.state?.visualization).toEqual(
      expect.objectContaining({
        layers: expect.arrayContaining([
          expect.objectContaining({ seriesType: 'bar_stacked', splitAccessor: undefined }),
        ]),
      })
    );
  });

  it('should return null if no indices exist', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      dataViewId: 'security-solution-default',
      indicesExist: false,
      selectedPatterns: ['auditbeat-*'],
      sourcererDataView: {},
    });
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'event.dataset',
        }),
      { wrapper }
    );

    expect(result?.current).toBeNull();
  });

  it('should return null if stackByField is an empty string', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      dataViewId: 'security-solution-default',
      indicesExist: false,
      selectedPatterns: ['auditbeat-*'],
      sourcererDataView: {},
    });
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: '',
        }),
      { wrapper }
    );

    expect(result?.current).toBeNull();
  });

  it('should return null if extraOptions.breakDownField is an empty string', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      dataViewId: 'security-solution-default',
      indicesExist: false,
      selectedPatterns: ['auditbeat-*'],
      sourcererDataView: {},
    });
    const { result } = renderHook(
      () =>
        useLensAttributes({
          getLensAttributes: getExternalAlertLensAttributes,
          stackByField: 'kibana.alert.rule.name',
          extraOptions: {
            breakdownField: '',
          },
        }),
      { wrapper }
    );

    expect(result?.current).toBeNull();
  });

  it('should return Lens attributes if adHocDataViews exist', () => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      dataViewId: 'security-solution-default',
      indicesExist: false,
      selectedPatterns: ['auditbeat-*'],
      sourcererDataView: {},
    });
    const { result } = renderHook(
      () =>
        useLensAttributes({
          lensAttributes: {
            ...kpiHostMetricLensAttributes,
            state: {
              ...kpiHostMetricLensAttributes.state,
              adHocDataViews: { mockAdHocDataViews: {} },
            },
          },
        }),
      { wrapper }
    );

    expect(result?.current).not.toBeNull();
  });
});
