/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ProcessEventHost,
  ProcessEventContainer,
  ProcessEventOrchestrator,
  ProcessEventCloud,
} from '../../../common/types/process_tree';
import { DASH } from '../../constants';
import {
  DetailPanelHost,
  DetailPanelContainer,
  DetailPanelOrchestrator,
  DetailPanelCloud,
} from '../../types';
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

export const getContainerData = (
  container: ProcessEventContainer | undefined
): DetailPanelContainer => {
  const detailPanelContainer: DetailPanelContainer = {
    id: DASH,
    name: DASH,
    image: {
      name: DASH,
      tag: DASH,
      hash: {
        all: DASH,
      },
    },
  };

  if (!container) {
    return detailPanelContainer;
  }

  detailPanelContainer.id = dataOrDash(container.id).toString();
  detailPanelContainer.name = dataOrDash(container.name).toString();
  detailPanelContainer.image.name = dataOrDash(container?.image?.name).toString();
  detailPanelContainer.image.tag = dataOrDash(container?.image?.tag).toString();
  detailPanelContainer.image.hash.all = dataOrDash(container?.image?.hash?.all).toString();

  return detailPanelContainer;
};

export const getOrchestratorData = (
  orchestrator: ProcessEventOrchestrator | undefined
): DetailPanelOrchestrator => {
  const detailPanelOrchestrator: DetailPanelOrchestrator = {
    resource: {
      name: DASH,
      type: DASH,
      ip: DASH,
      parent: {
        type: DASH,
      },
    },
    namespace: DASH,
    cluster: {
      name: DASH,
      id: DASH,
    },
  };

  if (!orchestrator) {
    return detailPanelOrchestrator;
  }

  detailPanelOrchestrator.resource.name = dataOrDash(orchestrator?.resource?.name).toString();
  detailPanelOrchestrator.resource.type = dataOrDash(orchestrator?.resource?.type).toString();
  detailPanelOrchestrator.resource.ip = dataOrDash(orchestrator?.resource?.ip).toString();
  detailPanelOrchestrator.namespace = dataOrDash(orchestrator?.namespace).toString();
  detailPanelOrchestrator.cluster.name = dataOrDash(orchestrator?.cluster?.name).toString();
  detailPanelOrchestrator.cluster.id = dataOrDash(orchestrator?.cluster?.id).toString();
  detailPanelOrchestrator.resource.parent.type = dataOrDash(
    orchestrator?.resource?.parent?.type
  ).toString();

  return detailPanelOrchestrator;
};

export const getCloudData = (cloud: ProcessEventCloud | undefined): DetailPanelCloud => {
  const detailPanelCloud: DetailPanelCloud = {
    instance: {
      name: DASH,
    },
    account: {
      id: DASH,
    },
    project: {
      id: DASH,
      name: DASH,
    },
    provider: DASH,
    region: DASH,
  };

  if (!cloud) {
    return detailPanelCloud;
  }

  detailPanelCloud.instance.name = dataOrDash(cloud?.instance?.name).toString();
  detailPanelCloud.account.id = dataOrDash(cloud?.account?.id).toString();
  detailPanelCloud.project.id = dataOrDash(cloud?.project?.id).toString();
  detailPanelCloud.project.name = dataOrDash(cloud?.project?.name).toString();
  detailPanelCloud.provider = dataOrDash(cloud?.provider).toString();
  detailPanelCloud.region = dataOrDash(cloud?.region).toString();

  return detailPanelCloud;
};
