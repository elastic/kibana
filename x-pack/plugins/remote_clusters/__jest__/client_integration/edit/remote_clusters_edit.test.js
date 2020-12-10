/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { act } from 'react-dom/test-utils';

import { RemoteClusterForm } from '../../../public/application/sections/components/remote_cluster_form';
import { setupEnvironment } from '../helpers';
import { setup as setupRemoteClustersAdd } from '../add/remote_clusters_add.helpers';
import {
  setup,
  REMOTE_CLUSTER_EDIT,
  REMOTE_CLUSTER_EDIT_NAME,
} from './remote_clusters_edit.helpers';

describe('Edit Remote cluster', () => {
  let component;
  let find;
  let exists;

  const { server, httpRequestsMockHelpers } = setupEnvironment();

  afterAll(() => {
    server.restore();
  });

  httpRequestsMockHelpers.setLoadRemoteClustersResponse([REMOTE_CLUSTER_EDIT]);

  beforeEach(async () => {
    await act(async () => {
      ({ component, find, exists } = setup());
    });
    component.update();
  });

  test('should have the title of the page set correctly', () => {
    expect(exists('remoteClusterPageTitle')).toBe(true);
    expect(find('remoteClusterPageTitle').text()).toEqual('Edit remote cluster');
  });

  test('should have a link to the documentation', () => {
    expect(exists('remoteClusterDocsButton')).toBe(true);
  });

  /**
   * As the "edit" remote cluster component uses the same form underneath that
   * the "create" remote cluster, we won't test it again but simply make sure that
   * the form component is indeed shared between the 2 app sections.
   */
  test('should use the same Form component as the "<RemoteClusterAdd />" component', async () => {
    let addRemoteClusterTestBed;

    await act(async () => {
      addRemoteClusterTestBed = setupRemoteClustersAdd();
    });

    addRemoteClusterTestBed.component.update();

    const formEdit = component.find(RemoteClusterForm);
    const formAdd = addRemoteClusterTestBed.component.find(RemoteClusterForm);

    expect(formEdit.length).toBe(1);
    expect(formAdd.length).toBe(1);
  });

  test('should populate the form fields with the values from the remote cluster loaded', () => {
    expect(find('remoteClusterFormNameInput').props().value).toBe(REMOTE_CLUSTER_EDIT_NAME);
    expect(find('remoteClusterFormSeedsInput').text()).toBe(REMOTE_CLUSTER_EDIT.seeds.join(''));
    expect(find('remoteClusterFormSkipUnavailableFormToggle').props()['aria-checked']).toBe(
      REMOTE_CLUSTER_EDIT.skipUnavailable
    );
  });

  test('should disable the form name input', () => {
    expect(find('remoteClusterFormNameInput').props().disabled).toBe(true);
  });
});
