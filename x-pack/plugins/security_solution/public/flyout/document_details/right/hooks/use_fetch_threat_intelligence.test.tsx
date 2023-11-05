/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type {
  UseThreatIntelligenceParams,
  UseThreatIntelligenceResult,
} from './use_fetch_threat_intelligence';
import { useFetchThreatIntelligence } from './use_fetch_threat_intelligence';
import { useInvestigationTimeEnrichment } from '../../../../common/containers/cti/event_enrichment';

jest.mock('../../../../common/containers/cti/event_enrichment');

const dataFormattedForFieldBrowser = [
  {
    category: 'kibana',
    field: 'kibana.alert.rule.uuid',
    isObjectArray: false,
    originalValue: ['uuid'],
    values: ['uuid'],
  },
  {
    category: 'threat',
    field: 'threat.enrichments',
    isObjectArray: true,
    originalValue: ['{"indicator.file.hash.sha256":["sha256"]}'],
    values: ['{"indicator.file.hash.sha256":["sha256"]}'],
  },
  {
    category: 'threat',
    field: 'threat.enrichments.indicator.file.hash.sha256',
    isObjectArray: false,
    originalValue: ['sha256'],
    values: ['sha256'],
  },
];

describe('useFetchThreatIntelligence', () => {
  let hookResult: RenderHookResult<UseThreatIntelligenceParams, UseThreatIntelligenceResult>;

  it('return render 1 match detected and 1 field enriched', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.1'],
            'matched.type': ['indicator_match_rule'],
          },
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.2'],
            'matched.type': ['investigation_time'],
            'event.type': ['indicator'],
          },
        ],
        totalCount: 2,
      },
      loading: false,
    });

    hookResult = renderHook(() => useFetchThreatIntelligence({ dataFormattedForFieldBrowser }));

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.threatMatches).toHaveLength(1);
    expect(hookResult.result.current.threatMatchesCount).toEqual(1);
    expect(hookResult.result.current.threatEnrichments).toHaveLength(1);
    expect(hookResult.result.current.threatEnrichmentsCount).toEqual(1);
  });

  it('should return 2 matches detected and 2 fields enriched', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.1'],
            'matched.type': ['indicator_match_rule'],
          },
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.2'],
            'matched.type': ['investigation_time'],
            'event.type': ['indicator'],
          },
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.3'],
            'matched.type': ['indicator_match_rule'],
          },
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.4'],
            'matched.type': ['investigation_time'],
            'event.type': ['indicator'],
          },
        ],
        totalCount: 4,
      },
      loading: false,
    });

    hookResult = renderHook(() => useFetchThreatIntelligence({ dataFormattedForFieldBrowser }));

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.threatMatches).toHaveLength(2);
    expect(hookResult.result.current.threatMatchesCount).toEqual(2);
    expect(hookResult.result.current.threatEnrichments).toHaveLength(2);
    expect(hookResult.result.current.threatEnrichmentsCount).toEqual(2);
  });

  it('should return 0 field enriched', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.1'],
            'matched.type': ['indicator_match_rule'],
          },
        ],
        totalCount: 1,
      },
      loading: false,
    });

    hookResult = renderHook(() => useFetchThreatIntelligence({ dataFormattedForFieldBrowser }));

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.threatMatches).toHaveLength(1);
    expect(hookResult.result.current.threatMatchesCount).toEqual(1);
    expect(hookResult.result.current.threatEnrichments).toEqual(undefined);
    expect(hookResult.result.current.threatEnrichmentsCount).toEqual(0);
  });

  it('should return 0 match detected', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: {
        enrichments: [
          {
            'threat.indicator.file.hash.sha256': 'sha256',
            'matched.atomic': ['sha256'],
            'matched.field': ['file.hash.sha256'],
            'matched.id': ['matched.id.2'],
            'matched.type': ['investigation_time'],
            'event.type': ['indicator'],
          },
        ],
        totalCount: 1,
      },
      loading: false,
    });

    hookResult = renderHook(() => useFetchThreatIntelligence({ dataFormattedForFieldBrowser }));

    expect(hookResult.result.current.loading).toEqual(false);
    expect(hookResult.result.current.threatMatches).toEqual(undefined);
    expect(hookResult.result.current.threatMatchesCount).toEqual(0);
    expect(hookResult.result.current.threatEnrichments).toHaveLength(1);
    expect(hookResult.result.current.threatEnrichmentsCount).toEqual(1);
  });

  it('should return loading true', () => {
    (useInvestigationTimeEnrichment as jest.Mock).mockReturnValue({
      result: undefined,
      loading: true,
    });

    hookResult = renderHook(() => useFetchThreatIntelligence({ dataFormattedForFieldBrowser }));

    expect(hookResult.result.current.loading).toEqual(true);
    expect(hookResult.result.current.threatMatches).toEqual(undefined);
    expect(hookResult.result.current.threatMatchesCount).toEqual(0);
    expect(hookResult.result.current.threatEnrichments).toEqual(undefined);
    expect(hookResult.result.current.threatEnrichmentsCount).toEqual(0);
  });
});
