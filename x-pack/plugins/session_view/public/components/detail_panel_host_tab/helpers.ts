/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessEventHost } from '../../../common/types/process_tree';
import { DASH } from '../../constants';
import { DetailPanelHost } from '../../types';
import { dataOrDash } from '../../utils/data_or_dash';

export const getHostData = (host: ProcessEventHost | undefined): DetailPanelHost => {
  const detailPanelHost: DetailPanelHost = {
    architecture: DASH,
    hostname: DASH,
    id: DASH,
    ip: DASH,
    mac: DASH,
    name: DASH,
    os: {
      family: DASH,
      full: DASH,
      kernel: DASH,
      name: DASH,
      platform: DASH,
      version: DASH,
    },
  };

  if (!host) {
    return detailPanelHost;
  }

  detailPanelHost.hostname = dataOrDash(host.hostname).toString();
  detailPanelHost.id = dataOrDash(host.id).toString();
  detailPanelHost.ip = host.ip?.map?.((ip) => dataOrDash(ip)).join(', ') ?? DASH;
  detailPanelHost.mac = host.mac?.map?.((mac) => dataOrDash(mac)).join(', ') ?? DASH;
  detailPanelHost.name = dataOrDash(host.name).toString();
  detailPanelHost.architecture = dataOrDash(host.architecture).toString();
  detailPanelHost.os.family = dataOrDash(host.os?.family).toString();
  detailPanelHost.os.full = dataOrDash(host.os?.full).toString();
  detailPanelHost.os.kernel = dataOrDash(host.os?.kernel).toString();
  detailPanelHost.os.name = dataOrDash(host.os?.name).toString();
  detailPanelHost.os.platform = dataOrDash(host.os?.platform).toString();
  detailPanelHost.os.version = dataOrDash(host.os?.version).toString();

  return detailPanelHost;
};
