/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseAlertTagsActionsProps } from './use_alert_tags_actions';
import { useAlertTagsActions } from './use_alert_tags_actions';
import { useAlertsPrivileges } from '../../../containers/detection_engine/alerts/use_alerts_privileges';
import type { AlertTableContextMenuItem } from '../types';
import { render, renderHook } from '@testing-library/react';
import React from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiPopover, EuiContextMenu } from '@elastic/eui';
import { TestProviders } from '../../../../common/mock';
import { useSetAlertTags } from '../../../../common/components/toolbar/bulk_actions/use_set_alert_tags';
import { useUiSetting$ } from '../../../../common/lib/kibana';

jest.mock('../../../containers/detection_engine/alerts/use_alerts_privileges');
jest.mock('../../../../common/components/toolbar/bulk_actions/use_set_alert_tags');
jest.mock('../../../../common/lib/kibana');

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

const renderContextMenu = (
  items: AlertTableContextMenuItem[],
  panels: EuiContextMenuPanelDescriptor[]
) => {
  const panelsToRender = [{ id: 0, items }, ...panels];
  return render(
    <EuiPopover
      isOpen={true}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      closePopover={() => {}}
      button={<></>}
    >
      <EuiContextMenu size="s" initialPanelId={1} panels={panelsToRender} />
    </EuiPopover>
  );
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

  it('should render the nested panel', async () => {
    (useSetAlertTags as jest.Mock).mockReturnValue(jest.fn());
    (useUiSetting$ as jest.Mock).mockReturnValue([['default-test-tag-1', 'default-test-tag-2']]);

    const { result } = renderHook(() => useAlertTagsActions(defaultProps), {
      wrapper: TestProviders,
    });
    const alertTagsItems = result.current.alertTagsItems;
    const alertTagsPanels = result.current.alertTagsPanels;
    const { getByTestId } = renderContextMenu(alertTagsItems, alertTagsPanels);

    expect(getByTestId('alert-tags-selectable-menu')).toBeInTheDocument();
  });
});
