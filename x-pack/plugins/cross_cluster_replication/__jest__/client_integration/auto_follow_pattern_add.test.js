/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import { initTestBed, registerHttpRequestMockHelpers, nextTick, findTestSubject, getRandomString } from './test_helpers';
import { AutoFollowPatternAdd } from '../../public/app/sections/auto_follow_pattern_add';
import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from '../../../../../src/legacy/ui/public/index_patterns';
import routing from '../../public/app/services/routing';

jest.mock('ui/chrome', () => ({
  addBasePath: (path) => path || 'api/cross_cluster_replication',
  breadcrumbs: { set: () => {} },
  getInjected: (key) => {
    if (key === 'uiCapabilities') {
      return {
        navLinks: {},
        management: {},
        catalogue: {}
      };
    }
  }
}));

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } =
    jest.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants');
  const { validateIndexPattern, ILLEGAL_CHARACTERS, CONTAINS_SPACES } =
    jest.requireActual('../../../../../src/legacy/ui/public/index_patterns/validate/validate_index_pattern');
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE, validateIndexPattern, ILLEGAL_CHARACTERS, CONTAINS_SPACES };
});

const testBedOptions = {
  memoryRouter: {
    onRouter: (router) => routing.reactRouter = router
  }
};

describe('Create Auto-follow pattern', () => {
  let server;
  let find;
  let exists;
  let component;
  let getUserActions;
  let form;
  let getFormErrorsMessages;
  let clickSaveForm;
  let setLoadRemoteClustersResponse;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;

    // Register helpers to mock Http Requests
    ({
      setLoadRemoteClustersResponse
    } = registerHttpRequestMockHelpers(server));

    // Set "default" mock responses by not providing any arguments
    setLoadRemoteClustersResponse();

    // Mock all HTTP Requests that have not been handled previously
    server.respondWith([200, {}, '']);
  });

  describe('on component mount', () => {
    beforeEach(() => {
      ({ find, exists } = initTestBed(AutoFollowPatternAdd, undefined, testBedOptions));
    });

    test('should display a "loading remote clusters" indicator', () => {
      expect(exists('remoteClustersLoading')).toBe(true);
      expect(find('remoteClustersLoading').text()).toBe('Loading remote clusters…');
    });

    test('should have a link to the documentation', () => {
      expect(exists('autoFollowPatternDocsButton')).toBe(true);
    });
  });

  describe('when remote clusters are loaded', () => {
    beforeEach(async () => {
      ({ find, exists, component, getUserActions, getFormErrorsMessages } = initTestBed(AutoFollowPatternAdd, undefined, testBedOptions));

      ({ clickSaveForm } = getUserActions('autoFollowPatternForm'));

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    test('should display the Auto-follow pattern form', async () => {
      expect(exists('ccrAutoFollowPatternForm')).toBe(true);
    });

    test('should display errors and disable the save button when clicking "save" without filling the form', () => {
      expect(exists('autoFollowPatternFormError')).toBe(false);
      expect(find('ccrAutoFollowPatternFormSubmitButton').props().disabled).toBe(false);

      clickSaveForm();

      expect(exists('autoFollowPatternFormError')).toBe(true);
      expect(getFormErrorsMessages()).toEqual([
        'Name is required.',
        'At least one leader index pattern is required.',
      ]);
      expect(find('ccrAutoFollowPatternFormSubmitButton').props().disabled).toBe(true);
    });
  });

  describe('form validation', () => {
    describe('auto-follow pattern name', () => {
      beforeEach(async () => {
        ({ component, form, getUserActions, getFormErrorsMessages } = initTestBed(AutoFollowPatternAdd, undefined, testBedOptions));
        ({ clickSaveForm } = getUserActions('autoFollowPatternForm'));

        await nextTick();
        component.update();
      });

      test('should not allow spaces', () => {
        form.setInputValue('ccrAutoFollowPatternFormNameInput', 'with space');
        clickSaveForm();
        expect(getFormErrorsMessages()).toContain('Spaces are not allowed in the name.');
      });

      test('should not allow a "_" (underscore) as first character', () => {
        form.setInputValue('ccrAutoFollowPatternFormNameInput', '_withUnderscore');
        clickSaveForm();
        expect(getFormErrorsMessages()).toContain(`Name can't begin with an underscore.`);
      });

      test('should not allow a "," (comma)', () => {
        form.setInputValue('ccrAutoFollowPatternFormNameInput', 'with,coma');
        clickSaveForm();
        expect(getFormErrorsMessages()).toContain(`Commas are not allowed in the name.`);
      });
    });

    describe('remote clusters', () => {
      describe('when no remote clusters were found', () => {
        test('should indicate it and have a button to add one', async () => {
          setLoadRemoteClustersResponse([]);

          ({ find, component } = initTestBed(AutoFollowPatternAdd, undefined, testBedOptions));
          await nextTick();
          component.update();
          const errorCallOut = find('remoteClusterFieldNoClusterFoundError');

          expect(errorCallOut.length).toBe(1);
          expect(findTestSubject(errorCallOut, 'ccrRemoteClusterAddButton').length).toBe(1);
        });
      });

      describe('when there was an error loading the remote clusters', () => {
        test('should indicate no clusters found and have a button to add one', async () => {
          setLoadRemoteClustersResponse(undefined, { body: 'Houston we got a problem' });

          ({ find, component } = initTestBed(AutoFollowPatternAdd, undefined, testBedOptions));
          await nextTick();
          component.update();
          const errorCallOut = find('remoteClusterFieldNoClusterFoundError');

          expect(errorCallOut.length).toBe(1);
          expect(findTestSubject(errorCallOut, 'ccrRemoteClusterAddButton').length).toBe(1);
        });
      });

      describe('when none of the remote clusters is connected', () => {
        const clusterName = 'new-york';
        const remoteClusters = [{
          name: clusterName,
          seeds: ['localhost:9600'],
          isConnected: false,
        }];

        beforeEach(async () => {
          setLoadRemoteClustersResponse(remoteClusters);

          ({ find, exists, component } = initTestBed(AutoFollowPatternAdd, undefined, testBedOptions));
          await nextTick();
          component.update();
        });

        test('should show a callout warning and have a button to edit the cluster', () => {
          const errorCallOut = find('remoteClusterFieldCallOutError');

          expect(errorCallOut.length).toBe(1);
          expect(errorCallOut.find('.euiCallOutHeader__title').text()).toBe(`Remote cluster '${clusterName}' is not connected`);
          expect(findTestSubject(errorCallOut, 'ccrRemoteClusterEditButton').length).toBe(1);
        });

        test('should have a button to add another remote cluster', () => {
          expect(exists('ccrRemoteClusterInlineAddButton')).toBe(true);
        });

        test('should indicate in the select option that the cluster is not connected', () => {
          const selectOptions = find('ccrRemoteClusterSelect').find('option');
          expect(selectOptions.at(0).text()).toBe(`${clusterName} (not connected)`);
        });
      });
    });

    describe('index patterns', () => {
      beforeEach(async () => {
        ({ component, form, getUserActions, getFormErrorsMessages } = initTestBed(AutoFollowPatternAdd, undefined, testBedOptions));
        ({ clickSaveForm } = getUserActions('autoFollowPatternForm'));

        await nextTick();
        component.update();
      });

      test('should not allow spaces', () => {
        expect(getFormErrorsMessages()).toEqual([]);

        form.setComboBoxValue('ccrAutoFollowPatternFormIndexPatternInput', 'with space');

        expect(getFormErrorsMessages()).toContain('Spaces are not allowed in the index pattern.');
      });

      test('should not allow invalid characters', () => {
        const expectInvalidChar = (char) => {
          form.setComboBoxValue('ccrAutoFollowPatternFormIndexPatternInput', `with${char}space`);
          expect(getFormErrorsMessages()).toContain(`Remove the character ${char} from the index pattern.`);
        };

        return INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.reduce((promise, char) => {
          return promise.then(() => expectInvalidChar(char));
        }, Promise.resolve());
      });
    });
  });

  describe('generated indices preview', () => {
    beforeEach(async () => {
      ({ exists, find, component, form, getUserActions } = initTestBed(AutoFollowPatternAdd, undefined, testBedOptions));
      ({ clickSaveForm } = getUserActions('autoFollowPatternForm'));

      await nextTick();
      component.update();
    });

    test('should display a preview of the possible indices generated by the auto-follow pattern', () => {
      expect(exists('ccrAutoFollowPatternIndicesPreview')).toBe(false);

      form.setComboBoxValue('ccrAutoFollowPatternFormIndexPatternInput', 'kibana-');

      expect(exists('ccrAutoFollowPatternIndicesPreview')).toBe(true);
    });

    test('should display 3 indices example when providing a wildcard(*)', () => {
      form.setComboBoxValue('ccrAutoFollowPatternFormIndexPatternInput', 'kibana-*');
      const indicesPreview = find('ccrAutoFollowPatternIndexPreview');

      expect(indicesPreview.length).toBe(3);
      expect(indicesPreview.at(0).text()).toContain('kibana-');
    });

    test('should only display 1 index example when *not* providing a wildcard', () => {
      form.setComboBoxValue('ccrAutoFollowPatternFormIndexPatternInput', 'kibana');
      const indicesPreview = find('ccrAutoFollowPatternIndexPreview');

      expect(indicesPreview.length).toBe(1);
      expect(indicesPreview.at(0).text()).toEqual('kibana');
    });

    test('should add the prefix and the suffix to the preview', () => {
      const prefix = getRandomString();
      const suffix = getRandomString();

      form.setComboBoxValue('ccrAutoFollowPatternFormIndexPatternInput', 'kibana');
      form.setInputValue('ccrAutoFollowPatternFormPrefixInput', prefix);
      form.setInputValue('ccrAutoFollowPatternFormSuffixInput', suffix);

      const indicesPreview = find('ccrAutoFollowPatternIndexPreview');
      const textPreview = indicesPreview.at(0).text();

      expect(textPreview).toContain(prefix);
      expect(textPreview).toContain(suffix);
    });
  });
});
