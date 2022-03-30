/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { TestBed } from '@kbn/test/jest';

import { RemoteClusterForm } from '../../../public/application/sections/components/remote_cluster_form';
import { RemoteClustersActions, setupEnvironment } from '../helpers';
import { setup as setupRemoteClustersAdd } from '../add/remote_clusters_add.helpers';
import {
  setup,
  REMOTE_CLUSTER_EDIT,
  REMOTE_CLUSTER_EDIT_NAME,
} from './remote_clusters_edit.helpers';
import { Cluster } from '../../../common/lib';

let component: TestBed['component'];
let actions: RemoteClustersActions;

describe('Edit Remote cluster', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  httpRequestsMockHelpers.setLoadRemoteClustersResponse([REMOTE_CLUSTER_EDIT]);

  beforeEach(async () => {
    await act(async () => {
      ({ component, actions } = await setup(httpSetup));
    });
    component.update();
  });

  test('should have the title of the page set correctly', () => {
    expect(actions.pageTitle.exists()).toBe(true);
    expect(actions.pageTitle.text()).toEqual('Edit remote cluster');
  });

  test('should have a link to the documentation', () => {
    expect(actions.docsButtonExists()).toBe(true);
  });

  /**
   * As the "edit" remote cluster component uses the same form underneath that
   * the "create" remote cluster, we won't test it again but simply make sure that
   * the form component is indeed shared between the 2 app sections.
   */
  test('should use the same Form component as the "<RemoteClusterAdd />" component', async () => {
    let addRemoteClusterTestBed: TestBed;

    await act(async () => {
      addRemoteClusterTestBed = await setupRemoteClustersAdd(httpSetup);
    });

    addRemoteClusterTestBed!.component.update();

    const formEdit = component.find(RemoteClusterForm);
    const formAdd = addRemoteClusterTestBed!.component.find(RemoteClusterForm);

    expect(formEdit.length).toBe(1);
    expect(formAdd.length).toBe(1);
  });

  test('should populate the form fields with the values from the remote cluster loaded', () => {
    expect(actions.nameInput.getValue()).toBe(REMOTE_CLUSTER_EDIT_NAME);
    // seeds input for sniff connection is not shown on Cloud
    expect(actions.seedsInput.getValue()).toBe(REMOTE_CLUSTER_EDIT.seeds.join(''));
    expect(actions.skipUnavailableSwitch.isChecked()).toBe(REMOTE_CLUSTER_EDIT.skipUnavailable);
  });

  test('should disable the form name input', () => {
    expect(actions.nameInput.isDisabled()).toBe(true);
  });

  describe('on cloud', () => {
    const cloudUrl = 'cloud-url';
    const defaultCloudPort = '9400';
    test('existing cluster that defaults to cloud url (default port)', async () => {
      const cluster: Cluster = {
        name: REMOTE_CLUSTER_EDIT_NAME,
        mode: 'proxy',
        proxyAddress: `${cloudUrl}:${defaultCloudPort}`,
        serverName: cloudUrl,
      };
      httpRequestsMockHelpers.setLoadRemoteClustersResponse([cluster]);

      await act(async () => {
        ({ component, actions } = await setup(httpSetup, { isCloudEnabled: true }));
      });
      component.update();

      expect(actions.cloudUrlInput.exists()).toBe(true);
      expect(actions.cloudUrlInput.getValue()).toBe(cloudUrl);
    });

    test('existing cluster that defaults to manual input (non-default port)', async () => {
      const cluster: Cluster = {
        name: REMOTE_CLUSTER_EDIT_NAME,
        mode: 'proxy',
        proxyAddress: `${cloudUrl}:9500`,
        serverName: cloudUrl,
      };
      httpRequestsMockHelpers.setLoadRemoteClustersResponse([cluster]);

      await act(async () => {
        ({ component, actions } = await setup(httpSetup, { isCloudEnabled: true }));
      });
      component.update();

      expect(actions.cloudUrlInput.exists()).toBe(false);

      expect(actions.proxyAddressInput.exists()).toBe(true);
      expect(actions.serverNameInput.exists()).toBe(true);
    });

    test('existing cluster that defaults to manual input (proxy address is different from server name)', async () => {
      const cluster: Cluster = {
        name: REMOTE_CLUSTER_EDIT_NAME,
        mode: 'proxy',
        proxyAddress: `${cloudUrl}:${defaultCloudPort}`,
        serverName: 'another-value',
      };
      httpRequestsMockHelpers.setLoadRemoteClustersResponse([cluster]);

      await act(async () => {
        ({ component, actions } = await setup(httpSetup, { isCloudEnabled: true }));
      });
      component.update();

      expect(actions.cloudUrlInput.exists()).toBe(false);

      expect(actions.proxyAddressInput.exists()).toBe(true);
      expect(actions.serverNameInput.exists()).toBe(true);
    });
  });
});
