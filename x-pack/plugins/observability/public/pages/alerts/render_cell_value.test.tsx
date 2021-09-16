/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error importing from a place other than root because we want to limit what we import from this package
import { ALERT_STATUS } from '@kbn/rule-data-utils/target_node/technical_field_names';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import type { CellValueElementProps } from '../../../../timelines/common';
import * as PluginHook from '../../hooks/use_plugin_context';
import { getRenderCellValue } from './render_cell_value';
import { AlertStatusIndicator } from '../../components/shared/alert_status_indicator';

interface AlertsTableRow {
  alertStatus: typeof ALERT_STATUS_ACTIVE | typeof ALERT_STATUS_RECOVERED;
}

describe('getRenderCellValue', () => {
  jest.spyOn(PluginHook, 'usePluginContext').mockImplementation(() => ({} as any));

  const renderCellValue = getRenderCellValue({
    setFlyoutAlert: jest.fn(),
  });

  describe('when column is alert status', () => {
    it('should return an active indicator when alert status is active', async () => {
      const cellValue = renderCellValue({
        ...requiredProperties,
        columnId: ALERT_STATUS,
        data: makeAlertsTableRow({ alertStatus: ALERT_STATUS_ACTIVE }),
      }) as JSX.Element;

      expect(cellValue.type).toEqual(AlertStatusIndicator);
      expect(cellValue.props).toEqual({ alertStatus: ALERT_STATUS_ACTIVE });
    });

    it('should return a recovered indicator when alert status is recovered', async () => {
      const cellValue = renderCellValue({
        ...requiredProperties,
        columnId: ALERT_STATUS,
        data: makeAlertsTableRow({ alertStatus: ALERT_STATUS_RECOVERED }),
      }) as JSX.Element;

      expect(cellValue.type).toEqual(AlertStatusIndicator);
      expect(cellValue.props).toEqual({ alertStatus: ALERT_STATUS_RECOVERED });
    });
  });
});

function makeAlertsTableRow({ alertStatus }: AlertsTableRow) {
  return [
    {
      field: ALERT_STATUS,
      value: [alertStatus],
    },
  ];
}

const requiredProperties: CellValueElementProps = {
  rowIndex: 0,
  columnId: '',
  setCellProps: jest.fn(),
  isExpandable: false,
  isExpanded: false,
  isDetails: false,
  data: [],
  eventId: '',
  header: {
    id: '',
    columnHeaderType: 'not-filtered',
  },
  isDraggable: false,
  linkValues: [],
  timelineId: '',
};
