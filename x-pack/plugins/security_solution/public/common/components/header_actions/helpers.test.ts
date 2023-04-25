/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiThemeVars } from '@kbn/ui-theme';
import {
  DEFAULT_ACTION_BUTTON_WIDTH,
  getActionsColumnWidth,
  isAlert,
  getSessionViewProcessIndex,
} from './helpers';

describe('isAlert', () => {
  test('it returns true when the eventType is an alert', () => {
    expect(isAlert('signal')).toBe(true);
  });

  test('it returns false when the eventType is NOT an alert', () => {
    expect(isAlert('raw')).toBe(false);
  });
});

describe('getActionsColumnWidth', () => {
  // ideally the following implementation detail wouldn't be part of these tests,
  // but without it, the test would be brittle when `euiDataGridCellPaddingM` changes:
  const expectedPadding = parseInt(euiThemeVars.euiDataGridCellPaddingM, 10) * 2;

  test('it returns the expected width', () => {
    const ACTION_BUTTON_COUNT = 5;
    const expectedContentWidth = ACTION_BUTTON_COUNT * DEFAULT_ACTION_BUTTON_WIDTH;

    expect(getActionsColumnWidth(ACTION_BUTTON_COUNT)).toEqual(
      expectedContentWidth + expectedPadding
    );
  });

  test('it returns the minimum width when the button count is zero', () => {
    const ACTION_BUTTON_COUNT = 0;

    expect(getActionsColumnWidth(ACTION_BUTTON_COUNT)).toEqual(
      DEFAULT_ACTION_BUTTON_WIDTH + expectedPadding
    );
  });

  test('it returns the minimum width when the button count is negative', () => {
    const ACTION_BUTTON_COUNT = -1;

    expect(getActionsColumnWidth(ACTION_BUTTON_COUNT)).toEqual(
      DEFAULT_ACTION_BUTTON_WIDTH + expectedPadding
    );
  });
});

describe('getSessionViewProcessIndex', () => {
  test('it returns process index for cloud_defend alert event index', () => {
    const result = getSessionViewProcessIndex(
      '.ds-logs-cloud_defend.alerts-default-2023.04.25-000001'
    );

    expect(result).toEqual('logs-cloud_defend.process*');
  });

  test('it returns process index for cloud_defend file event index', () => {
    const result = getSessionViewProcessIndex(
      '.ds-logs-cloud_defend.file-default-2023.04.25-000001'
    );

    expect(result).toEqual('logs-cloud_defend.process*');
  });

  test('it returns process index for cloud_defend process event index', () => {
    const result = getSessionViewProcessIndex(
      '.ds-logs-cloud_defend.process-default-2023.04.25-000001'
    );

    expect(result).toEqual('logs-cloud_defend.process*');
  });

  test('it returns process index for cloud_defend that includes cluster', () => {
    const result = getSessionViewProcessIndex(
      'aws_ec2:.ds-logs-cloud_defend.process-default-2023.04.25-000001'
    );

    expect(result).toEqual('aws_ec2:logs-cloud_defend.process*');
  });

  test('it returns process index for endpoint file index', () => {
    const result = getSessionViewProcessIndex(
      '.ds-logs-endpoint.events.file-default-2023.04.25-000001'
    );

    expect(result).toEqual('logs-endpoint.events.process*');
  });

  test('it returns process index for endpoint alerts index', () => {
    const result = getSessionViewProcessIndex('.ds-logs-endpoint.alerts-default-2023.04.25-000001');

    expect(result).toEqual('logs-endpoint.events.process*');
  });

  test('it returns process index for endpoint process index', () => {
    const result = getSessionViewProcessIndex(
      '.ds-logs-endpoint.events.process-default-2023.04.25-000001'
    );

    expect(result).toEqual('logs-endpoint.events.process*');
  });

  test('it returns process index for endpoint that includes cluster', () => {
    const result = getSessionViewProcessIndex(
      'azure-01:.ds-logs-endpoint.events.process-default-2023.04.25-000001'
    );

    expect(result).toEqual('azure-01:logs-endpoint.events.process*');
  });
});
