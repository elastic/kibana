/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ALERT_STATUS,
  ALERT_FLAPPING,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
} from '@kbn/rule-data-utils';
import type { CellValueElementProps } from '@kbn/timelines-plugin/common';
import { createObservabilityRuleTypeRegistryMock } from '../../../../rules/observability_rule_type_registry_mock';
import { render } from '../../../../utils/test_helper';

import { getRenderCellValue } from './render_cell_value';

interface AlertsTableRow {
  alertStatus: typeof ALERT_STATUS_ACTIVE | typeof ALERT_STATUS_RECOVERED;
  flapping?: string;
}

const observabilityRuleTypeRegistryMock = createObservabilityRuleTypeRegistryMock();

describe('getRenderCellValue', () => {
  const renderCellValue = getRenderCellValue({
    setFlyoutAlert: jest.fn(),
    observabilityRuleTypeRegistry: observabilityRuleTypeRegistryMock,
  });

  describe('when column is alert status', () => {
    it('should return an active indicator when alert status is active', async () => {
      const cell = render(
        renderCellValue({
          ...requiredProperties,
          columnId: ALERT_STATUS,
          data: makeAlertsTableRow({ alertStatus: ALERT_STATUS_ACTIVE }),
        })
      );

      expect(cell.getByText('Active')).toBeInTheDocument();
    });

    it('should return a recovered indicator when alert status is recovered', async () => {
      const cell = render(
        renderCellValue({
          ...requiredProperties,
          columnId: ALERT_STATUS,
          data: makeAlertsTableRow({ alertStatus: ALERT_STATUS_RECOVERED }),
        })
      );

      expect(cell.getByText('Recovered')).toBeInTheDocument();
    });

    describe('when using alert lifecycle status badge', () => {
      const getAlertLifecycleStatusBadgeMock = jest.fn();
      const renderCellValueWithFlapping = getRenderCellValue({
        setFlyoutAlert: jest.fn(),
        getAlertLifecycleStatusBadge: getAlertLifecycleStatusBadgeMock,
        observabilityRuleTypeRegistry: observabilityRuleTypeRegistryMock,
      });

      beforeEach(() => {
        getAlertLifecycleStatusBadgeMock.mockClear();
      });

      it('should return a flapping indicator when alert is active and flapping', async () => {
        render(
          renderCellValueWithFlapping({
            ...requiredProperties,
            columnId: ALERT_STATUS,
            data: makeAlertsTableRow({ alertStatus: ALERT_STATUS_ACTIVE, flapping: 'true' }),
          })
        );

        expect(getAlertLifecycleStatusBadgeMock).toHaveBeenCalledWith({
          alertStatus: ALERT_STATUS_ACTIVE,
          flapping: 'true',
        });
      });

      it('should return an active indicator when alert is active not flapping', async () => {
        render(
          renderCellValueWithFlapping({
            ...requiredProperties,
            columnId: ALERT_STATUS,
            data: makeAlertsTableRow({ alertStatus: ALERT_STATUS_ACTIVE, flapping: 'false' }),
          })
        );

        expect(getAlertLifecycleStatusBadgeMock).toHaveBeenCalledWith({
          alertStatus: ALERT_STATUS_ACTIVE,
          flapping: 'false',
        });
      });

      it('should return a recovered indicator when alert is recovered and flapping', async () => {
        render(
          renderCellValueWithFlapping({
            ...requiredProperties,
            columnId: ALERT_STATUS,
            data: makeAlertsTableRow({ alertStatus: ALERT_STATUS_RECOVERED, flapping: 'true' }),
          })
        );

        expect(getAlertLifecycleStatusBadgeMock).toHaveBeenCalledWith({
          alertStatus: ALERT_STATUS_RECOVERED,
          flapping: 'true',
        });
      });
    });
  });
});

function makeAlertsTableRow({ alertStatus, flapping }: AlertsTableRow) {
  return [
    {
      field: ALERT_STATUS,
      value: [alertStatus],
    },
    ...(flapping !== undefined
      ? [
          {
            field: ALERT_FLAPPING,
            value: [flapping],
          },
        ]
      : []),
  ];
}

const requiredProperties: CellValueElementProps = {
  rowIndex: 0,
  colIndex: 0,
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
  scopeId: '',
};
