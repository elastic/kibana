/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '@kbn/timelines-plugin/public/mock';
import { renderHook } from '@testing-library/react-hooks';
import type { UseAlertTagsActionsProps } from './use_alert_tags_actions';
import { useAlertTagsActions } from './use_alert_tags_actions';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';

jest.mock('../../../containers/detection_engine/alerts/use_alerts_privileges');

const defaultProps: UseAlertTagsActionsProps = {
  closePopover: jest.fn(),
  ecsRowData: {
    _id: '123',
    kibana: {
      alert: {
        workflow_tags: [],
      },
    },
  },
  refetch: jest.fn(),
};

describe('useAlertTagsActions', () => {
  beforeEach(() => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({
      hasIndexWrite: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render alert tagging actions', () => {
    const { result } = renderHook(() => useAlertTagsActions(defaultProps), {
      wrapper: TestProviders,
    });
    expect(result.current.alertTagsItems.length).toEqual(1);
    expect(result.current.alertTagsPanels.length).toEqual(1);

    expect(result.current.alertTagsItems[0]['data-test-subj']).toEqual(
      'alert-tags-context-menu-item'
    );
    expect(result.current.alertTagsPanels[0].content).toMatchInlineSnapshot(`
      <Memo(BulkAlertTagsPanelComponent)
        alertItems={
          Array [
            Object {
              "_id": "123",
              "_index": "",
              "data": Array [
                Object {
                  "field": "kibana.alert.workflow_tags",
                  "value": Array [],
                },
              ],
              "ecs": Object {
                "_id": "123",
                "_index": "",
              },
            },
          ]
        }
        closePopoverMenu={[MockFunction]}
        onSubmit={[Function]}
        refetchQuery={[MockFunction]}
        setIsLoading={[Function]}
      />
    `);
  });

  it("should not render alert tagging actions if user doesn't have write permissions", () => {
    (useAlertsPrivileges as jest.Mock).mockReturnValue({
      hasIndexWrite: false,
    });
    const { result } = renderHook(() => useAlertTagsActions(defaultProps), {
      wrapper: TestProviders,
    });
    expect(result.current.alertTagsItems.length).toEqual(0);
  });

  it('should still render if workflow_tags field does not exist', () => {
    const newProps = {
      ...defaultProps,
      ecsRowData: {
        _id: '123',
      },
    };
    const { result } = renderHook(() => useAlertTagsActions(newProps), {
      wrapper: TestProviders,
    });
    expect(result.current.alertTagsItems.length).toEqual(1);
    expect(result.current.alertTagsPanels.length).toEqual(1);
    expect(result.current.alertTagsPanels[0].content).toMatchInlineSnapshot(`
      <Memo(BulkAlertTagsPanelComponent)
        alertItems={
          Array [
            Object {
              "_id": "123",
              "_index": "",
              "data": Array [
                Object {
                  "field": "kibana.alert.workflow_tags",
                  "value": Array [],
                },
              ],
              "ecs": Object {
                "_id": "123",
                "_index": "",
              },
            },
          ]
        }
        closePopoverMenu={[MockFunction]}
        onSubmit={[Function]}
        refetchQuery={[MockFunction]}
        setIsLoading={[Function]}
      />
    `);
  });
});
