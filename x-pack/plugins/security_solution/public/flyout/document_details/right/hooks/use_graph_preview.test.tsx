/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RenderHookResult } from '@testing-library/react-hooks';
import { renderHook } from '@testing-library/react-hooks';
import type { UseGraphPreviewParams, UseGraphPreviewResult } from './use_graph_preview';
import { useGraphPreview } from './use_graph_preview';
import type { GetFieldsData } from '../../shared/hooks/use_get_fields_data';
import { mockFieldData } from '../../shared/mocks/mock_get_fields_data';

describe('useGraphPreview', () => {
  let hookResult: RenderHookResult<UseGraphPreviewParams, UseGraphPreviewResult>;

  it(`should return false when missing actor`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.original_event.id') {
        return field;
      }
      return mockFieldData[field];
    };

    hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
      },
    });

    expect(hookResult.result.current.isAuditLog).toEqual(false);
  });

  it(`should return false when missing event.action`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.original_event.id') {
        return 'eventId';
      } else if (field === 'actor.entity.id') {
        return 'actorId';
      }
      return mockFieldData[field];
    };

    hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
        },
      },
    });

    expect(hookResult.result.current.isAuditLog).toEqual(false);
  });

  it(`should return false when missing original_event.id`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'actor.entity.id') {
        return 'actorId';
      }
      return mockFieldData[field];
    };

    hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
      },
    });

    expect(hookResult.result.current.isAuditLog).toEqual(false);
  });

  it(`should return false when timestamp is missing`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === '@timestamp') {
        return;
      } else if (field === 'kibana.alert.original_event.id') {
        return 'eventId';
      } else if (field === 'actor.entity.id') {
        return 'actorId';
      }

      return mockFieldData[field];
    };

    hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
      },
    });

    expect(hookResult.result.current.isAuditLog).toEqual(false);
  });

  it(`should return true when alert is has graph preview`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.original_event.id') {
        return 'eventId';
      } else if (field === 'actor.entity.id') {
        return 'actorId';
      }

      return mockFieldData[field];
    };

    hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action'],
          },
        },
      },
    });

    expect(hookResult.result.current.isAuditLog).toEqual(true);
  });

  it(`should return true when alert is has graph preview with multiple values`, () => {
    const getFieldsData: GetFieldsData = (field: string) => {
      if (field === 'kibana.alert.original_event.id') {
        return ['id1', 'id2'];
      } else if (field === 'actor.entity.id') {
        return ['actorId1', 'actorId2'];
      }

      return mockFieldData[field];
    };

    hookResult = renderHook((props: UseGraphPreviewParams) => useGraphPreview(props), {
      initialProps: {
        getFieldsData,
        ecsData: {
          _id: 'id',
          event: {
            action: ['action1', 'action2'],
          },
        },
      },
    });

    expect(hookResult.result.current.isAuditLog).toEqual(true);
  });
});
