/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks/dom';
import {
  useNavigateFindings,
  useNavigateFindingsByResource,
  useNavigateVulnerabilities,
} from './use_navigate_findings';
import { useHistory } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
  useHistory: jest.fn().mockReturnValue({ push: jest.fn() }),
}));

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      data: {
        query: {
          queryString: {
            getDefaultQuery: jest.fn().mockReturnValue({
              language: 'kuery',
              query: '',
            }),
          },
        },
      },
    },
  }),
}));
jest.mock('../api/use_latest_findings_data_view', () => ({
  useLatestFindingsDataView: jest.fn().mockReturnValue({
    status: 'success',
    data: {
      id: 'data-view-id',
    },
  }),
}));

describe('useNavigateFindings', () => {
  it('creates a URL to findings page with correct path, filter and dataViewId', () => {
    const push = jest.fn();
    (useHistory as jest.Mock).mockReturnValueOnce({ push });

    const { result } = renderHook(() => useNavigateFindings());

    act(() => {
      result.current({ foo: 1 });
    });

    expect(push).toHaveBeenCalledWith({
      pathname: '/cloud_security_posture/findings/configurations',
      search:
        "cspq=(filters:!((meta:(alias:!n,disabled:!f,index:data-view-id,key:foo,negate:!f,type:phrase),query:(match_phrase:(foo:1)))),query:(language:kuery,query:''))",
    });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('creates a URL to findings page with correct path and negated filter', () => {
    const push = jest.fn();
    (useHistory as jest.Mock).mockReturnValueOnce({ push });

    const { result } = renderHook(() => useNavigateFindings());

    act(() => {
      result.current({ foo: { value: 1, negate: true } });
    });

    expect(push).toHaveBeenCalledWith({
      pathname: '/cloud_security_posture/findings/configurations',
      search:
        "cspq=(filters:!((meta:(alias:!n,disabled:!f,index:data-view-id,key:foo,negate:!t,type:phrase),query:(match_phrase:(foo:1)))),query:(language:kuery,query:''))",
    });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('creates a URL to findings resource page with correct path and filter', () => {
    const push = jest.fn();
    (useHistory as jest.Mock).mockReturnValueOnce({ push });

    const { result } = renderHook(() => useNavigateFindingsByResource());

    act(() => {
      result.current({ foo: 1 });
    });

    expect(push).toHaveBeenCalledWith({
      pathname: '/cloud_security_posture/findings/resource',
      search:
        "cspq=(filters:!((meta:(alias:!n,disabled:!f,index:data-view-id,key:foo,negate:!f,type:phrase),query:(match_phrase:(foo:1)))),query:(language:kuery,query:''))",
    });
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('creates a URL to vulnerabilities page with correct path, filter and dataViewId', () => {
    const push = jest.fn();
    (useHistory as jest.Mock).mockReturnValueOnce({ push });

    const { result } = renderHook(() => useNavigateVulnerabilities());

    act(() => {
      result.current({ foo: 1 });
    });

    expect(push).toHaveBeenCalledWith({
      pathname: '/cloud_security_posture/findings/vulnerabilities',
      search:
        "cspq=(filters:!((meta:(alias:!n,disabled:!f,index:security-solution-default,key:foo,negate:!f,type:phrase),query:(match_phrase:(foo:1)))),query:(language:kuery,query:''))",
    });
    expect(push).toHaveBeenCalledTimes(1);
  });
});
