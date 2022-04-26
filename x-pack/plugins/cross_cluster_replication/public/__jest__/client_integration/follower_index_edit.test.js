/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from 'react-dom/test-utils';

import { API_BASE_PATH } from '../../../common/constants';
import { FollowerIndexForm } from '../../app/components/follower_index_form/follower_index_form';
import './mocks';
import { FOLLOWER_INDEX_EDIT, FOLLOWER_INDEX_EDIT_NAME } from './helpers/constants';
import { setupEnvironment, pageHelpers, nextTick } from './helpers';

const { setup } = pageHelpers.followerIndexEdit;
const { setup: setupFollowerIndexAdd } = pageHelpers.followerIndexAdd;

describe('Edit follower index', () => {
  let httpSetup;
  let httpRequestsMockHelpers;

  beforeAll(() => {
    const mockEnvironment = setupEnvironment();
    httpRequestsMockHelpers = mockEnvironment.httpRequestsMockHelpers;
    httpSetup = mockEnvironment.httpSetup;
  });

  describe('on component mount', () => {
    let find;
    let component;

    const remoteClusters = [{ name: 'new-york', seeds: ['localhost:123'], isConnected: true }];

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);
      httpRequestsMockHelpers.setGetFollowerIndexResponse(
        FOLLOWER_INDEX_EDIT_NAME,
        FOLLOWER_INDEX_EDIT
      );
      ({ component, find } = setup());

      await nextTick();
      component.update();
    });

    /**
     * As the "edit" follower index component uses the same form underneath that
     * the "create" follower index, we won't test it again but simply make sure that
     * the form component is indeed shared between the 2 app sections.
     */
    test('should use the same Form component as the "<FollowerIndexAdd />" component', async () => {
      const { component: addFollowerIndexComponent } = setupFollowerIndexAdd();

      await nextTick();
      addFollowerIndexComponent.update();

      const formEdit = component.find(FollowerIndexForm);
      const formAdd = addFollowerIndexComponent.find(FollowerIndexForm);

      expect(formEdit.length).toBe(1);
      expect(formAdd.length).toBe(1);
    });

    test('should populate the form fields with the values from the follower index loaded', () => {
      const inputToPropMap = {
        remoteClusterInput: 'remoteCluster',
        leaderIndexInput: 'leaderIndex',
        followerIndexInput: 'name',
        maxReadRequestOperationCountInput: 'maxReadRequestOperationCount',
        maxOutstandingReadRequestsInput: 'maxOutstandingReadRequests',
        maxReadRequestSizeInput: 'maxReadRequestSize',
        maxWriteRequestOperationCountInput: 'maxWriteRequestOperationCount',
        maxWriteRequestSizeInput: 'maxWriteRequestSize',
        maxOutstandingWriteRequestsInput: 'maxOutstandingWriteRequests',
        maxWriteBufferCountInput: 'maxWriteBufferCount',
        maxWriteBufferSizeInput: 'maxWriteBufferSize',
        maxRetryDelayInput: 'maxRetryDelay',
        readPollTimeoutInput: 'readPollTimeout',
      };

      Object.entries(inputToPropMap).forEach(([input, prop]) => {
        const expected = FOLLOWER_INDEX_EDIT[prop];
        const { value } = find(input).props();
        try {
          expect(value).toBe(expected);
        } catch {
          throw new Error(
            `Input "${input}" does not equal "${expected}". (Value received: "${value}")`
          );
        }
      });
    });
  });

  describe('API', () => {
    const remoteClusters = [{ name: 'new-york', seeds: ['localhost:123'], isConnected: true }];
    let testBed;

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse(remoteClusters);
      httpRequestsMockHelpers.setGetFollowerIndexResponse(
        FOLLOWER_INDEX_EDIT_NAME,
        FOLLOWER_INDEX_EDIT
      );

      await act(async () => {
        testBed = await setup();
      });

      testBed.component.update();
    });

    test('is consumed correctly', async () => {
      const { actions, form, component, find } = testBed;

      form.setInputValue('maxRetryDelayInput', '10s');

      actions.clickSaveForm();
      component.update(); // The modal to confirm the update opens
      find('confirmModalConfirmButton').simulate('click');

      await nextTick(); // Make sure the Request went through

      expect(httpSetup.put).toHaveBeenLastCalledWith(
        `${API_BASE_PATH}/follower_indices/${FOLLOWER_INDEX_EDIT_NAME}`,
        expect.objectContaining({
          body: JSON.stringify({
            maxReadRequestOperationCount: 7845,
            maxOutstandingReadRequests: 16,
            maxReadRequestSize: '64mb',
            maxWriteRequestOperationCount: 2456,
            maxWriteRequestSize: '1048b',
            maxOutstandingWriteRequests: 69,
            maxWriteBufferCount: 123456,
            maxWriteBufferSize: '256mb',
            maxRetryDelay: '10s',
            readPollTimeout: '2m',
          }),
        })
      );
    });
  });

  describe('when the remote cluster is disconnected', () => {
    let find;
    let exists;
    let component;
    let actions;
    let form;

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadRemoteClustersResponse([
        { name: 'new-york', seeds: ['localhost:123'], isConnected: false },
      ]);
      httpRequestsMockHelpers.setGetFollowerIndexResponse(
        FOLLOWER_INDEX_EDIT_NAME,
        FOLLOWER_INDEX_EDIT
      );
      ({ component, find, exists, actions, form } = setup());

      await nextTick();
      component.update();
    });

    test('should display an error and have a button to edit the remote cluster', () => {
      const error = find('remoteClusterFormField.notConnectedError');

      expect(error.length).toBe(1);
      expect(error.find('.euiCallOutHeader__title').text()).toBe(
        `Can't edit follower index because remote cluster '${FOLLOWER_INDEX_EDIT.remoteCluster}' is not connected`
      );
      expect(exists('remoteClusterFormField.notConnectedError.editButton')).toBe(true);
    });

    test('should prevent saving the form and display an error message for the required remote cluster', () => {
      actions.clickSaveForm();

      expect(form.getErrorsMessages()).toEqual(['A connected remote cluster is required.']);
      expect(find('submitButton').props().disabled).toBe(true);
    });
  });
});
