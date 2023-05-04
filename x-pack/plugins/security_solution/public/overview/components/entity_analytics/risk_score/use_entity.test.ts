/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { RiskScoreEntity } from '../../../../../common/search_strategy/security_solution/risk_score';
import { useEntityInfo } from './use_entity';

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn(),
  };
});

describe('useEntityInfo', () => {
  it('should return host entity info', () => {
    const { result } = renderHook(() => useEntityInfo(RiskScoreEntity.host));
    expect(result?.current).toMatchInlineSnapshot(`
      Object {
        "docLink": "https://www.elastic.co/guide/en/security/current/host-risk-score.html",
        "kpiQueryId": "headerHostRiskScoreKpiQuery",
        "linkProps": Object {
          "deepLinkId": "hosts",
          "onClick": [Function],
          "path": "/hostRisk",
        },
        "tableQueryId": "hostRiskDashboardTable",
      }
    `);
  });
  it('should return user entity info', () => {
    const { result } = renderHook(() => useEntityInfo(RiskScoreEntity.user));
    expect(result?.current).toMatchInlineSnapshot(`
      Object {
        "docLink": "https://www.elastic.co/guide/en/security/current/user-risk-score.html",
        "kpiQueryId": "headerUserRiskScoreKpiQuery",
        "linkProps": Object {
          "deepLinkId": "users",
          "onClick": [Function],
          "path": "/userRisk",
        },
        "tableQueryId": "userRiskDashboardTable",
      }
    `);
  });
});
