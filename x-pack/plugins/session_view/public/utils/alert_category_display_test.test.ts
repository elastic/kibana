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
import { dataOrDash } from './data_or_dash';
import { DASH } from '../constants';
import { ProcessEventAlertCategory } from '../../common/types/process_tree';

describe('getAlertCategoryDisplayText(alert, category)', () => {
  const ruleName = mockAlerts[0].kibana?.alert?.rule?.name;
  it('should display file path when alert category is file', () => {
    expect(getAlertCategoryDisplayText(mockFileAlert, ProcessEventAlertCategory?.file)).toEqual(
      mockFileAlert?.file?.path
    );
  });

  it('should display network transport layer, protocol of internet protocol, ip address with port when alert category is network', () => {
    const networkDisplay = getAlertNetworkDisplay(
      mockNetworkAlert.network,
      mockNetworkAlert.destination
    );
    expect(
      getAlertCategoryDisplayText(mockNetworkAlert, ProcessEventAlertCategory.network)
    ).toEqual(networkDisplay);
  });

  it('should display rule name when alert category is process', () => {
    expect(getAlertCategoryDisplayText(mockAlerts[0], ProcessEventAlertCategory.process)).toEqual(
      dataOrDash(ruleName)
    );
  });

  it('should display rule name when alert category is undefined', () => {
    expect(getAlertCategoryDisplayText(mockAlerts[0], undefined)).toEqual(ruleName);
  });

  it('should display rule name when file path is undefined', () => {
    const fileAlert = { ...mockFileAlert, file: {} };
    expect(getAlertCategoryDisplayText(fileAlert, ProcessEventAlertCategory.file)).toEqual(
      dataOrDash(fileAlert?.kibana?.alert?.rule?.name)
    );
  });
  it('should display rule name when destination is undefined and alert category is network', () => {
    const networkAlert = { ...mockNetworkAlert, destination: undefined };
    expect(getAlertCategoryDisplayText(networkAlert, ProcessEventAlertCategory.network)).toEqual(
      dataOrDash(networkAlert?.kibana?.alert?.rule?.name)
    );
  });

  it('should display rule name when network  is undefined and alert category is network', () => {
    const networkAlert = { ...mockNetworkAlert, network: undefined };
    expect(getAlertCategoryDisplayText(networkAlert, ProcessEventAlertCategory.network)).toEqual(
      dataOrDash(networkAlert?.kibana?.alert?.rule?.name)
    );
  });
});

describe('getAlertNetworkDisplay(network, destination)', () => {
  it('should transport message with dash  when network transport is undefined', () => {
    const text = `Transport protocol: ${DASH} | Network protocol: ${dataOrDash(mockNetworkAlert.network.protocol)} | Destination: ${mockNetworkAlert.destination.address}:${mockNetworkAlert.destination.port}`;
    expect(
      getAlertNetworkDisplay(
        { ...mockNetworkAlert.network, transport: undefined },
        mockNetworkAlert.destination
      )
    ).toEqual(text);
  });

  it('should show network protocol with dash  when network protocol does not exist', () => {
    const text = `Transport protocol: ${mockNetworkAlert.network.transport} | Network protocol: - | Destination: ${mockNetworkAlert.destination.address}:${mockNetworkAlert.destination.port}`;
    expect(
      getAlertNetworkDisplay(
        { ...mockNetworkAlert.network, protocol: undefined },
        mockNetworkAlert.destination
      )
    ).toEqual(text);
  });

  it('should show network display text  when network protocol and transport exist', () => {
    const text = `Transport protocol: ${mockNetworkAlert.network.transport} | Network protocol: ${mockNetworkAlert.network.protocol} | Destination: ${mockNetworkAlert.destination.address}:${mockNetworkAlert.destination.port}`;
    expect(
      getAlertNetworkDisplay(
        { ...mockNetworkAlert.network, protocol: mockNetworkAlert.network.protocol },
        mockNetworkAlert.destination
      )
    ).toEqual(text);
  });

  it('should show only ip address  when network port does not exist', () => {
    const text = `Transport protocol: ${ mockNetworkAlert?.network?.transport} | Network protocol: ${mockNetworkAlert?.network?.protocol} | Destination: ${dataOrDash(mockNetworkAlert?.destination?.address)}`;
    expect(
      getAlertNetworkDisplay(mockNetworkAlert.network, {
        ...mockNetworkAlert.destination,
        port: undefined,
      })
    ).toEqual(text);
  });

  it('should show dash  when address does not exist', () => {
    const text = `Transport protocol: ${mockNetworkAlert.network.transport} | Network protocol: ${mockNetworkAlert?.network?.protocol} | Destination: -`;
    expect(
      getAlertNetworkDisplay(
        mockNetworkAlert.network,
        {...mockNetworkAlert.destination, address: undefined}
      )
    ).toEqual(text);
  });
});
