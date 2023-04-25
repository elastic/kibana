/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import {
  ProcessEventHost,
  ProcessEventContainer,
  ProcessEventOrchestrator,
  ProcessEventCloud,
} from '../../../common/types/process_tree';
import { DetailPanelMetadataTab } from '.';

const TEST_ARCHITECTURE = 'x86_64';
const TEST_HOSTNAME = 'host-james-fleet-714-2';
const TEST_ID = '48c1b3f1ac5da4e0057fc9f60f4d1d5d';
const TEST_IP = ['127.0.0.1', '::1', '10.132.0.50', 'fe80::7d39:3147:4d9a:f809'];
const TEST_MAC = ['42:01:0a:84:00:32'];
const TEST_NAME = 'name-james-fleet-714-2';
const TEST_OS_FAMILY = 'family-centos';
const TEST_OS_FULL = 'full-CentOS 7.9.2009';
const TEST_OS_KERNEL = '3.10.0-1160.31.1.el7.x86_64 #1 SMP Thu Jun 10 13:32:12 UTC 2021';
const TEST_OS_NAME = 'os-Linux';
const TEST_OS_PLATFORM = 'platform-centos';
const TEST_OS_VERSION = 'version-7.9.2009';

// Container data
const TEST_CONTAINER_ID =
  'containerd://5fe98d5566148268631302790833b7a14317a2fd212e3e4117bede77d0ca9ba6';
const TEST_CONTAINER_NAME = 'gce-pd-driver';
const TEST_CONTAINER_IMAGE_NAME = 'gke.gcr.io/gcp-compute-persistent-disk-csi-driver';
const TEST_CONTAINER_IMAGE_TAG = 'v1.3.5-gke.0';
const TEST_CONTAINER_IMAGE_HASH_ALL = 'PLACEHOLDER_FOR_IMAGE.HASH.ALL';

// Orchestrator data
const TEST_ORCHESTRATOR_RESOURCE_NAME = 'pdcsi-node-6hvsp';
const TEST_ORCHESTRATOR_RESOURCE_TYPE = 'pod';
const TEST_ORCHESTRATOR_RESOURCE_IP = 'PLACEHOLDER_FOR_RESOURCE.IP';
const TEST_ORCHESTRATOR_NAMESPACE = 'kube-system';
const TEST_ORCHESTRATOR_RESOURCE_PARENT_TYPE = 'elastic-k8s-cluster';
const TEST_ORCHESTRATOR_CLUSTER_ID = 'PLACEHOLDER_FOR_CLUSTER.ID';
const TEST_ORCHESTRATOR_CLUSTER_NAME = 'PLACEHOLDER_FOR_CLUSTER.NAME';

// Cloud data
const TEST_CLOUD_INSTANCE_NAME = 'gke-cluster-1-paulo-default-pool-f0fea4ab-lhx2';
const TEST_CLOUD_ACCOUNT_ID = 'PLACEHOLDER_FOR_CLOUD_ACCOUNT_ID';
const TEST_CLOUD_PROJECT_ID = 'elastic-security-dev';
const TEST_CLOUD_PROVIDER = 'gcp';
const TEST_CLOUD_REGION = 'us-central1-c';

const TEST_HOST: ProcessEventHost = {
  architecture: TEST_ARCHITECTURE,
  hostname: TEST_HOSTNAME,
  id: TEST_ID,
  ip: TEST_IP,
  mac: TEST_MAC,
  name: TEST_NAME,
  os: {
    family: TEST_OS_FAMILY,
    full: TEST_OS_FULL,
    kernel: TEST_OS_KERNEL,
    name: TEST_OS_NAME,
    platform: TEST_OS_PLATFORM,
    version: TEST_OS_VERSION,
  },
};

const TEST_CONTAINER: ProcessEventContainer = {
  id: TEST_CONTAINER_ID,
  name: TEST_CONTAINER_NAME,
  image: {
    name: TEST_CONTAINER_IMAGE_NAME,
    tag: TEST_CONTAINER_IMAGE_TAG,
    hash: {
      all: TEST_CONTAINER_IMAGE_HASH_ALL,
    },
  },
};

const TEST_ORCHESTRATOR: ProcessEventOrchestrator = {
  resource: {
    name: TEST_ORCHESTRATOR_RESOURCE_NAME,
    type: TEST_ORCHESTRATOR_RESOURCE_TYPE,
    ip: TEST_ORCHESTRATOR_RESOURCE_IP,
    parent: {
      type: TEST_ORCHESTRATOR_RESOURCE_PARENT_TYPE,
    },
  },
  namespace: TEST_ORCHESTRATOR_NAMESPACE,
  cluster: {
    name: TEST_ORCHESTRATOR_CLUSTER_NAME,
    id: TEST_ORCHESTRATOR_CLUSTER_ID,
  },
};

const TEST_CLOUD: ProcessEventCloud = {
  instance: {
    name: TEST_CLOUD_INSTANCE_NAME,
  },
  account: {
    id: TEST_CLOUD_ACCOUNT_ID,
  },
  project: {
    id: TEST_CLOUD_PROJECT_ID,
  },
  provider: TEST_CLOUD_PROVIDER,
  region: TEST_CLOUD_REGION,
};

describe('DetailPanelMetadataTab component', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
  });

  describe('When DetailPanelMetadataTab is mounted', () => {
    it('renders DetailPanelMetadataTab correctly (non cloud environment)', async () => {
      renderResult = mockedContext.render(<DetailPanelMetadataTab processHost={TEST_HOST} />);

      expect(renderResult.queryByText('hostname')).toBeVisible();
      expect(renderResult.queryAllByText('id').length).toBe(1);
      expect(renderResult.queryByText('ip')).toBeVisible();
      expect(renderResult.queryByText('mac')).toBeVisible();
      expect(renderResult.queryAllByText('name').length).toBe(1);
      expect(renderResult.queryByText(TEST_HOSTNAME)).toBeVisible();
      expect(renderResult.queryByText(TEST_ID)).toBeVisible();
      expect(renderResult.queryByText(TEST_IP.join(', '))).toBeVisible();
      expect(renderResult.queryByText(TEST_MAC.join(', '))).toBeVisible();
      expect(renderResult.queryByText(TEST_NAME)).toBeVisible();

      // expand host os accordion
      renderResult.queryByText('OS')?.click();
      expect(renderResult.queryByText('architecture')).toBeVisible();
      expect(renderResult.queryByText('os.family')).toBeVisible();
      expect(renderResult.queryByText('os.full')).toBeVisible();
      expect(renderResult.queryByText('os.kernel')).toBeVisible();
      expect(renderResult.queryByText('os.name')).toBeVisible();
      expect(renderResult.queryByText('os.platform')).toBeVisible();
      expect(renderResult.queryByText('os.version')).toBeVisible();
      expect(renderResult.queryByText(TEST_ARCHITECTURE)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_FAMILY)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_FULL)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_KERNEL)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_NAME)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_PLATFORM)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_VERSION)).toBeVisible();

      // Orchestrator and Container should be missing if session came from a Non-cloud env
      expect(renderResult.queryByText('Container')).toBeNull();
      expect(renderResult.queryByText('Orchestrator')).toBeNull();
      expect(renderResult.queryByText('Cloud')).toBeNull();
    });

    it('renders DetailPanelMetadataTab correctly (cloud environment)', async () => {
      renderResult = mockedContext.render(
        <DetailPanelMetadataTab
          processHost={TEST_HOST}
          processContainer={TEST_CONTAINER}
          processOrchestrator={TEST_ORCHESTRATOR}
          processCloud={TEST_CLOUD}
        />
      );

      expect(renderResult.queryByText('hostname')).toBeVisible();
      expect(renderResult.queryByText('ip')).toBeVisible();
      expect(renderResult.queryByText('mac')).toBeVisible();
      expect(renderResult.queryByText(TEST_HOSTNAME)).toBeVisible();
      expect(renderResult.queryByText(TEST_ID)).toBeVisible();
      expect(renderResult.queryByText(TEST_IP.join(', '))).toBeVisible();
      expect(renderResult.queryByText(TEST_MAC.join(', '))).toBeVisible();
      expect(renderResult.queryByText(TEST_NAME)).toBeVisible();

      // Checks for existence of id and name fields in Host and Container accordion
      expect(renderResult.queryAllByText('id').length).toBe(2);
      expect(renderResult.queryAllByText('name').length).toBe(2);

      // expand host os accordion
      renderResult.queryByText('OS')?.click();
      expect(renderResult.queryByText('architecture')).toBeVisible();
      expect(renderResult.queryByText('os.family')).toBeVisible();
      expect(renderResult.queryByText('os.full')).toBeVisible();
      expect(renderResult.queryByText('os.kernel')).toBeVisible();
      expect(renderResult.queryByText('os.name')).toBeVisible();
      expect(renderResult.queryByText('os.platform')).toBeVisible();
      expect(renderResult.queryByText('os.version')).toBeVisible();
      expect(renderResult.queryByText(TEST_ARCHITECTURE)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_FAMILY)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_FULL)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_KERNEL)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_NAME)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_PLATFORM)).toBeVisible();
      expect(renderResult.queryByText(TEST_OS_VERSION)).toBeVisible();

      // expand Container Accordion
      renderResult.queryByText('Container')?.click();
      expect(renderResult.queryByText('image.name')).toBeVisible();
      expect(renderResult.queryByText('image.tag')).toBeVisible();
      expect(renderResult.queryByText('image.hash.all')).toBeVisible();
      expect(renderResult.queryByText(TEST_CONTAINER_ID)).toBeVisible();
      expect(renderResult.queryByText(TEST_CONTAINER_NAME)).toBeVisible();
      expect(renderResult.queryByText(TEST_CONTAINER_IMAGE_NAME)).toBeVisible();
      expect(renderResult.queryByText(TEST_CONTAINER_IMAGE_TAG)).toBeVisible();
      expect(renderResult.queryByText(TEST_CONTAINER_IMAGE_HASH_ALL)).toBeVisible();

      // expand Orchestrator Accordion
      renderResult.queryByText('Orchestrator')?.click();
      expect(renderResult.queryByText('resource.name')).toBeVisible();
      expect(renderResult.queryByText('resource.type')).toBeVisible();
      expect(renderResult.queryByText('resource.ip')).toBeVisible();
      expect(renderResult.queryByText('namespace')).toBeVisible();
      expect(renderResult.queryByText('resource.parent.type')).toBeVisible();
      expect(renderResult.queryByText('cluster.id')).toBeVisible();
      expect(renderResult.queryByText('cluster.name')).toBeVisible();
      expect(renderResult.queryByText(TEST_ORCHESTRATOR_RESOURCE_NAME)).toBeVisible();
      expect(renderResult.queryByText(TEST_ORCHESTRATOR_RESOURCE_TYPE)).toBeVisible();
      expect(renderResult.queryByText(TEST_ORCHESTRATOR_RESOURCE_IP)).toBeVisible();
      expect(renderResult.queryByText(TEST_ORCHESTRATOR_NAMESPACE)).toBeVisible();
      expect(renderResult.queryByText(TEST_ORCHESTRATOR_RESOURCE_PARENT_TYPE)).toBeVisible();
      expect(renderResult.queryByText(TEST_ORCHESTRATOR_CLUSTER_ID)).toBeVisible();
      expect(renderResult.queryByText(TEST_ORCHESTRATOR_CLUSTER_NAME)).toBeVisible();

      // expand Cloud Accordion
      renderResult.queryByText('Cloud')?.click();
      expect(renderResult.queryByText('instance.name')).toBeVisible();
      expect(renderResult.queryByText('provider')).toBeVisible();
      expect(renderResult.queryByText('region')).toBeVisible();
      expect(renderResult.queryByText('account.id')).toBeVisible();
      expect(renderResult.queryByText('project.id')).toBeVisible();
      expect(renderResult.queryByText(TEST_CLOUD_INSTANCE_NAME)).toBeVisible();
      expect(renderResult.queryByText(TEST_CLOUD_PROVIDER)).toBeVisible();
      expect(renderResult.queryByText(TEST_CLOUD_REGION)).toBeVisible();
      expect(renderResult.queryByText(TEST_CLOUD_ACCOUNT_ID)).toBeVisible();
      expect(renderResult.queryByText(TEST_CLOUD_PROJECT_ID)).toBeVisible();
    });
  });
});
