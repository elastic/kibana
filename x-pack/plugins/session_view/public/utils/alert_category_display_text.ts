/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ProcessEvent,
  ProcessEventAlertCategory,
  ProcessEventIPAddress,
  ProcessEventNetwork,
} from '../../common/types/process_tree';
import { dataOrDash } from './data_or_dash';

export const getAlertCategoryDisplayText = (alert: ProcessEvent, category: string | undefined) => {
  const destination = alert?.destination;
  const network = alert?.network;
  const filePath = alert?.file?.path;
  const ruleName = alert?.kibana?.alert?.rule?.name;

  if (filePath && category === ProcessEventAlertCategory.file) return dataOrDash(filePath);
  if (destination && network && category === ProcessEventAlertCategory.network)
    return getAlertNetworkDisplay(network, destination);

  return dataOrDash(ruleName);
};

export const getAlertNetworkDisplay = (
  network: ProcessEventNetwork,
  destination: ProcessEventIPAddress
) => {
  const hasIpAddressPort = !!destination?.address && !!destination?.port;
  const ipAddressPort = `${destination?.address}:${destination?.port}`;
  const transportLayer = network?.transport;
  const appLayerProtocol = network?.protocol;
  return `Transport protocol: ${dataOrDash(transportLayer)} | Network protocol: ${dataOrDash(
    appLayerProtocol
  )} | Destination: ${hasIpAddressPort ? ipAddressPort : dataOrDash(destination?.address)}`;
};
