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
} from '../../common/types/process_tree';
import { dataOrDash } from './data_or_dash';

export const getAlertCategoryDisplayText = (alert: ProcessEvent, category: string | undefined) => {
  const destination = alert?.destination;
  const filePath = alert?.file?.path;

  if (filePath && category === ProcessEventAlertCategory.file) return dataOrDash(filePath);
  if (destination?.address && category === ProcessEventAlertCategory.network)
    return dataOrDash(getAlertNetworkDisplay(destination));
  return;
};

export const getAlertNetworkDisplay = (destination: ProcessEventIPAddress) => {
  const hasIpAddressPort = !!destination?.address && !!destination?.port;
  const ipAddressPort = `${destination?.address}:${destination?.port}`;
  return `${hasIpAddressPort ? ipAddressPort : destination?.address}`;
};
