/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useBulkActions, useBulkUntrackActions } from './use_bulk_actions';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';
import { AlertsTableQueryContext } from '../contexts/alerts_table_context';

jest.mock('./apis/bulk_get_cases');
jest.mock('../../../../common/lib/kibana');

const mockKibana = jest.fn().mockReturnValue({});

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');

  return {
    ...original,
    useKibana: () => mockKibana(),
  };
});

describe('bulk action hooks', () => {
  const casesConfig = { featureId: 'test-feature-id', owner: ['test-owner'] };
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer(AlertsTableQueryContext);
  });

  const refresh = jest.fn();
  const clearSelection = jest.fn();
  const setIsBulkActionsLoading = jest.fn();

  describe('useBulkUntrackActions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it('should not show the bulk actions when the user lacks any observability permissions', () => {
      mockKibana.mockImplementation(() => ({
        services: {
          application: { capabilities: {} },
        },
      }));
      const { result } = renderHook(
        () =>
          useBulkUntrackActions({
            setIsBulkActionsLoading,
            refresh,
            clearSelection,
            isAllSelected: true,
            query: {
              bool: {
                must: {
                  term: {
                    test: 'test',
                  },
                },
              },
            },
          }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      expect(result.current.length).toBe(0);
    });
  });

  describe('useBulkActions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockKibana.mockImplementation(() => ({
        services: {
          application: { capabilities: { infrastructure: { show: true } } },
        },
      }));
    });

    it('appends the case and untrack bulk actions', async () => {
      const { result } = renderHook(
        () => useBulkActions({ alerts: [], query: {}, casesConfig, refresh }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      expect(result.current.bulkActions).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": 0,
            "items": Array [
              Object {
                "data-test-subj": "attach-new-case",
                "disableOnQuery": true,
                "disabledLabel": "Add to new case",
                "key": "attach-new-case",
                "label": "Add to new case",
                "onClick": [Function],
              },
              Object {
                "data-test-subj": "attach-existing-case",
                "disableOnQuery": true,
                "disabledLabel": "Add to existing case",
                "key": "attach-existing-case",
                "label": "Add to existing case",
                "onClick": [Function],
              },
              Object {
                "data-test-subj": "mark-as-untracked",
                "disableOnQuery": false,
                "disabledLabel": "Mark as untracked",
                "key": "mark-as-untracked",
                "label": "Mark as untracked",
                "onClick": [Function],
              },
            ],
          },
        ]
      `);
    });

    it('appends only the case bulk actions for SIEM', async () => {
      const { result } = renderHook(
        () => useBulkActions({ alerts: [], query: {}, casesConfig, refresh, featureIds: ['siem'] }),
        {
          wrapper: appMockRender.AppWrapper,
        }
      );

      expect(result.current.bulkActions).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": 0,
            "items": Array [
              Object {
                "data-test-subj": "attach-new-case",
                "disableOnQuery": true,
                "disabledLabel": "Add to new case",
                "key": "attach-new-case",
                "label": "Add to new case",
                "onClick": [Function],
              },
              Object {
                "data-test-subj": "attach-existing-case",
                "disableOnQuery": true,
                "disabledLabel": "Add to existing case",
                "key": "attach-existing-case",
                "label": "Add to existing case",
                "onClick": [Function],
              },
            ],
          },
        ]
      `);
    });
  });
});
