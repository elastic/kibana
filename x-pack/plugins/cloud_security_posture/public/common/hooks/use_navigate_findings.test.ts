/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks/dom';
import { useNavigateFindings, useNavigateFindingsByResource } from './use_navigate_findings';
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

describe('useNavigateFindings', () => {
  it('creates a URL to findings page with correct path and filter', () => {
    const push = jest.fn();
    (useHistory as jest.Mock).mockReturnValueOnce({ push });

    const filter = { foo: 1 };

    const { result } = renderHook(() => useNavigateFindings());

    act(() => {
      result.current({ filter });
    });

    expect(push).toHaveBeenCalledWith({
      pathname: '/cloud_security_posture/findings/default',
      search:
        "cspq=(filters:!((meta:(alias:!n,disabled:!f,key:filter,negate:!f,params:(query:(foo:1)),type:phrase),query:(match_phrase:(filter:(foo:1))))),query:(language:kuery,query:''))",
    });
    expect(push).toHaveBeenCalledTimes(1);
  });
  it('creates a URL to findings resource page with correct path and filter', () => {
    const push = jest.fn();
    (useHistory as jest.Mock).mockReturnValueOnce({ push });

    const filter = { foo: 1 };

    const { result } = renderHook(() => useNavigateFindingsByResource());

    act(() => {
      result.current({ filter });
    });

    expect(push).toHaveBeenCalledWith({
      pathname: '/cloud_security_posture/findings/resource',
      search:
        "cspq=(filters:!((meta:(alias:!n,disabled:!f,key:filter,negate:!f,params:(query:(foo:1)),type:phrase),query:(match_phrase:(filter:(foo:1))))),query:(language:kuery,query:''))",
    });
    expect(push).toHaveBeenCalledTimes(1);
  });
});
