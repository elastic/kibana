/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  mockAlerts,
  mockFileAlert,
  mockNetworkAlert,
} from '../../common/mocks/constants/session_view_process.mock';
import { getAlertCategoryDisplayText, getAlertNetworkDisplay } from './alert_category_display_text';
import { ProcessEventAlertCategory } from '../../common/types/process_tree';

describe('getAlertCategoryDisplayText(alert, category)', () => {
  it('should display file path when alert category is file', () => {
    expect(getAlertCategoryDisplayText(mockFileAlert, ProcessEventAlertCategory?.file)).toEqual(
      mockFileAlert?.file?.path
    );
  });

  it('should display rule name when alert category is process', () => {
    expect(getAlertCategoryDisplayText(mockAlerts[0], ProcessEventAlertCategory.process)).toEqual(
      undefined
    );
  });

  it('should display rule name when alert category is undefined', () => {
    expect(getAlertCategoryDisplayText(mockAlerts[0], undefined)).toEqual(undefined);
  });

  it('should display rule name when file path is undefined', () => {
    const fileAlert = { ...mockFileAlert, file: {} };
    expect(getAlertCategoryDisplayText(fileAlert, ProcessEventAlertCategory.file)).toEqual(
      undefined
    );
  });
  it('should display rule name when destination address is undefined and alert category is network', () => {
    const networkAlert = { ...mockNetworkAlert, destination: undefined };
    expect(getAlertCategoryDisplayText(networkAlert, ProcessEventAlertCategory.network)).toEqual(
      undefined
    );
  });
});

describe('getAlertNetworkDisplay(destination)', () => {
  it('should show destination address and port', () => {
    const text = `${mockNetworkAlert.destination.address}:${mockNetworkAlert.destination.port}`;
    expect(getAlertNetworkDisplay(mockNetworkAlert.destination)).toEqual(text);
  });

  it('should show only ip address  when port does not exist', () => {
    const text = `${mockNetworkAlert?.destination?.address}`;
    expect(
      getAlertNetworkDisplay({
        ...mockNetworkAlert.destination,
        port: undefined,
      })
    ).toEqual(text);
  });
});
