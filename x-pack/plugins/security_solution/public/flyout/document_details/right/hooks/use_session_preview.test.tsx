/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { UseSessionPreviewParams } from './use_session_preview';
import { useSessionPreview } from './use_session_preview';
import type { SessionViewConfig } from '@kbn/securitysolution-data-table/common/types';
import type { GetFieldsData } from '../../../../common/hooks/use_get_fields_data';

describe('useSessionPreview', () => {
  let hookResult: RenderHookResult<UseSessionPreviewParams, SessionViewConfig | null>;

  it(`should return a session view config object`, () => {
    const getFieldsData: GetFieldsData = (field: string) => field;

    hookResult = renderHook((props: UseSessionPreviewParams) => useSessionPreview(props), {
      initialProps: { getFieldsData },
    });

    expect(hookResult.result.current).toEqual({
      index: 'kibana.alert.ancestors.index',
      investigatedAlertId: '_id',
      jumpToCursor: 'kibana.alert.original_time',
      jumpToEntityId: 'process.entity_id',
      sessionEntityId: 'process.entry_leader.entity_id',
      sessionStartTime: 'process.entry_leader.start',
    });
  });

  it(`should return null if data isn't ready for session view`, () => {
    const getFieldsData: GetFieldsData = (field: string) => '';

    hookResult = renderHook((props: UseSessionPreviewParams) => useSessionPreview(props), {
      initialProps: { getFieldsData },
    });

    expect(hookResult.result.current).toEqual(null);
  });
});
