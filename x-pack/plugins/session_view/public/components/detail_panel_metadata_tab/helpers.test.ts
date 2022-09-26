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
import { getHostData, getContainerData, getOrchestratorData, getCloudData } from './helpers';

const MOCK_HOST_DATA: ProcessEventHost = {
  architecture: 'x86_64',
  hostname: 'james-fleet-714-2',
  id: '48c1b3f1ac5da4e0057fc9f60f4d1d5d',
  ip: ['127.0.0.1', '::1', '10.132.0.50', 'fe80::7d39:3147:4d9a:f809'],
  mac: ['42:01:0a:84:00:32'],
  name: 'james-fleet-714-2',
  os: {
    family: 'centos',
    full: 'CentOS 7.9.2009',
    kernel: '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021',
    name: 'Linux',
    platform: 'centos',
    version: '7.9.2009',
  },
};

const MOCK_CONTAINER_DATA: ProcessEventContainer = {
  id: 'containerd://5fe98d5566148268631302790833b7a14317a2fd212e3e4117bede77d0ca9ba6',
  name: 'gce-pd-driver',
  image: {
    name: 'gke.gcr.io/gcp-compute-persistent-disk-csi-driver',
    tag: 'v1.3.5-gke.0',
    hash: {
      all: 'PLACEHOLDER_FOR_IMAGE.HASH.ALL',
    },
  },
};

const MOCK_ORCHESTRATOR_DATA: ProcessEventOrchestrator = {
  resource: {
    name: 'pdcsi-node-6hvsp',
    type: 'pod',
    ip: 'PLACEHOLDER_FOR_RESOURCE.IP',
    parent: {
      type: 'PLACEHOLDER_FOR_RESOURCE.PARENT.TYPE',
    },
  },
  namespace: 'kube-system',
  cluster: {
    name: 'elastic-k8s-cluster',
    id: 'PLACEHOLDER_FOR_CLUSTER.ID',
  },
};

const MOCK_CLOUD_DATA: ProcessEventCloud = {
  instance: {
    name: 'gke-cluster-1-paulo-default-pool-f0fea4ab-lhx2',
  },
  account: {
    id: 'PLACEHOLDER_FOR_CLOUD_ACCOUNT_ID',
  },
  project: {
    id: 'elastic-security-dev',
  },
  provider: 'gcp',
  region: 'us-central1-c',
};

describe('detail panel host tab helpers tests', () => {
  it('getHostData returns fields with a dash with undefined host', () => {
    const result = getHostData(undefined);
    expect(result.architecture).toEqual(DASH);
    expect(result.hostname).toEqual(DASH);
    expect(result.id).toEqual(DASH);
    expect(result.ip).toEqual(DASH);
    expect(result.mac).toEqual(DASH);
    expect(result.name).toEqual(DASH);
    expect(result.os.family).toEqual(DASH);
    expect(result.os.full).toEqual(DASH);
    expect(result.os.kernel).toEqual(DASH);
    expect(result.os.name).toEqual(DASH);
    expect(result.os.platform).toEqual(DASH);
    expect(result.os.version).toEqual(DASH);
  });

  it('getHostData returns dashes for missing fields', () => {
    const result = getHostData({
      ...MOCK_HOST_DATA,
      ip: ['127.0.0.1', '', '', 'fe80::7d39:3147:4d9a:f809'],
      name: undefined,
      os: {
        ...MOCK_HOST_DATA.os,
        full: undefined,
        platform: undefined,
      },
    });
    expect(result.architecture).toEqual(MOCK_HOST_DATA.architecture);
    expect(result.hostname).toEqual(MOCK_HOST_DATA.hostname);
    expect(result.id).toEqual(MOCK_HOST_DATA.id);
    expect(result.ip).toEqual(['127.0.0.1', DASH, DASH, 'fe80::7d39:3147:4d9a:f809'].join(', '));
    expect(result.mac).toEqual(MOCK_HOST_DATA.mac?.join(', '));
    expect(result.name).toEqual(DASH);
    expect(result.os.family).toEqual(MOCK_HOST_DATA.os?.family);
    expect(result.os.full).toEqual(DASH);
    expect(result.os.kernel).toEqual(MOCK_HOST_DATA.os?.kernel);
    expect(result.os.name).toEqual(MOCK_HOST_DATA.os?.name);
    expect(result.os.platform).toEqual(DASH);
    expect(result.os.version).toEqual(MOCK_HOST_DATA.os?.version);
  });

  it('getHostData returns all data provided', () => {
    const result = getHostData(MOCK_HOST_DATA);
    expect(result.architecture).toEqual(MOCK_HOST_DATA.architecture);
    expect(result.hostname).toEqual(MOCK_HOST_DATA.hostname);
    expect(result.id).toEqual(MOCK_HOST_DATA.id);
    expect(result.ip).toEqual(MOCK_HOST_DATA.ip?.join(', '));
    expect(result.mac).toEqual(MOCK_HOST_DATA.mac?.join(', '));
    expect(result.name).toEqual(MOCK_HOST_DATA.name);
    expect(result.os.family).toEqual(MOCK_HOST_DATA.os?.family);
    expect(result.os.full).toEqual(MOCK_HOST_DATA.os?.full);
    expect(result.os.kernel).toEqual(MOCK_HOST_DATA.os?.kernel);
    expect(result.os.name).toEqual(MOCK_HOST_DATA.os?.name);
    expect(result.os.platform).toEqual(MOCK_HOST_DATA.os?.platform);
    expect(result.os.version).toEqual(MOCK_HOST_DATA.os?.version);
  });

  it('getContainerData returns dashes for missing fields', () => {
    const result = getContainerData({
      id: undefined,
      name: 'gce-pd-driver',
      image: {
        name: undefined,
        tag: 'v1.3.5-gke.0',
        hash: {
          all: undefined,
        },
      },
    });
    expect(result.id).toEqual(DASH);
    expect(result.name).toEqual(MOCK_CONTAINER_DATA.name);
    expect(result.image.name).toEqual(DASH);
    expect(result.image.tag).toEqual(MOCK_CONTAINER_DATA?.image?.tag);
    expect(result.image.hash.all).toEqual(DASH);
  });

  it('getContainerData returns all data provided', () => {
    const result = getContainerData(MOCK_CONTAINER_DATA);
    expect(result.id).toEqual(MOCK_CONTAINER_DATA.id);
    expect(result.name).toEqual(MOCK_CONTAINER_DATA.name);
    expect(result.image.name).toEqual(MOCK_CONTAINER_DATA?.image?.name);
    expect(result.image.tag).toEqual(MOCK_CONTAINER_DATA?.image?.tag);
    expect(result.image.hash.all).toEqual(MOCK_CONTAINER_DATA?.image?.hash?.all);
  });

  it('getOchestratorData returns dashes for missing fields', () => {
    const result = getOrchestratorData({
      resource: {
        name: undefined,
        type: 'pod',
        ip: undefined,
        parent: {
          type: 'PLACEHOLDER_FOR_RESOURCE.PARENT.TYPE',
        },
      },
      namespace: 'kube-system',
      cluster: {
        name: 'elastic-k8s-cluster',
        id: undefined,
      },
    });
    expect(result.resource.name).toEqual(DASH);
    expect(result.resource.type).toEqual(MOCK_ORCHESTRATOR_DATA?.resource?.type);
    expect(result.resource.ip).toEqual(DASH);
    expect(result.namespace).toEqual(MOCK_ORCHESTRATOR_DATA?.namespace);
    expect(result.cluster.name).toEqual(MOCK_ORCHESTRATOR_DATA?.cluster?.name);
    expect(result.cluster.id).toEqual(DASH);
    expect(result.resource.parent.type).toEqual(MOCK_ORCHESTRATOR_DATA?.resource?.parent?.type);
  });

  it('getOchestratorData returns all data provided', () => {
    const result = getOrchestratorData(MOCK_ORCHESTRATOR_DATA);
    expect(result.resource.name).toEqual(MOCK_ORCHESTRATOR_DATA?.resource?.name);
    expect(result.resource.type).toEqual(MOCK_ORCHESTRATOR_DATA?.resource?.type);
    expect(result.resource.ip).toEqual(MOCK_ORCHESTRATOR_DATA?.resource?.ip);
    expect(result.namespace).toEqual(MOCK_ORCHESTRATOR_DATA?.namespace);
    expect(result.cluster.name).toEqual(MOCK_ORCHESTRATOR_DATA?.cluster?.name);
    expect(result.cluster.id).toEqual(MOCK_ORCHESTRATOR_DATA?.cluster?.id);
    expect(result.resource.parent.type).toEqual(MOCK_ORCHESTRATOR_DATA?.resource?.parent?.type);
  });

  it('getCloudData returns dashes for missing fields', () => {
    const result = getCloudData({
      instance: {
        name: 'gke-cluster-1-paulo-default-pool-f0fea4ab-lhx2',
      },
      account: {
        id: undefined,
      },
      project: {
        id: 'elastic-security-dev',
      },
      provider: undefined,
      region: 'us-central1-c',
    });
    expect(result.instance.name).toEqual(MOCK_CLOUD_DATA?.instance?.name);
    expect(result.account.id).toEqual(DASH);
    expect(result.project.id).toEqual(MOCK_CLOUD_DATA?.project?.id);
    expect(result.provider).toEqual(DASH);
    expect(result.region).toEqual(MOCK_CLOUD_DATA?.region);
  });

  it('getCloudData returns all data provided', () => {
    const result = getCloudData(MOCK_CLOUD_DATA);
    expect(result.instance.name).toEqual(MOCK_CLOUD_DATA?.instance?.name);
    expect(result.account.id).toEqual(MOCK_CLOUD_DATA?.account?.id);
    expect(result.project.id).toEqual(MOCK_CLOUD_DATA?.project?.id);
    expect(result.provider).toEqual(MOCK_CLOUD_DATA?.provider);
    expect(result.region).toEqual(MOCK_CLOUD_DATA?.region);
  });
});
