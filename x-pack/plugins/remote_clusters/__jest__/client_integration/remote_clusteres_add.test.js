/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import sinon from 'sinon';

import { initTestBed, nextTick } from './test_helpers';
import { RemoteClusterAdd } from '../../public/sections/remote_cluster_add';
// import { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } from '../../../../../src/legacy/ui/public/index_patterns';
import { registerRouter } from '../../public/services/routing';

jest.mock('ui/chrome', () => ({
  addBasePath: (path) => path || 'api/cross_cluster_replication',
  breadcrumbs: { set: () => {} },
}));

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = jest.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants'); // eslint-disable-line max-len
  const { validateIndexPattern, ILLEGAL_CHARACTERS, CONTAINS_SPACES } = jest.requireActual('../../../../../src/legacy/ui/public/index_patterns/validate/validate_index_pattern'); // eslint-disable-line max-len
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE, validateIndexPattern, ILLEGAL_CHARACTERS, CONTAINS_SPACES };
});

const testBedOptions = {
  memoryRouter: {
    onRouter: (router) => registerRouter(router)
  }
};

describe('Create Remote cluster', () => {
  let server;

  beforeEach(() => {
    server = sinon.fakeServer.create();
    server.respondImmediately = true;

    // Register helpers to mock Http Requests
    // ({
    //   setLoadRemoteClusteresResponse
    // } = registerHttpRequestMockHelpers(server));

    // // Set "default" mock responses by not providing any arguments
    // setLoadRemoteClusteresResponse();

    // Mock all HTTP Requests that have not been handled previously
    server.respondWith([200, {}, '']);
  });

  describe('on component mount', () => {
    let find;
    let exists;
    let getUserActions;
    let clickSaveForm;
    let getFormErrorsMessages;

    beforeEach(() => {
      ({ exists, find, getUserActions, getFormErrorsMessages } = initTestBed(RemoteClusterAdd, undefined, testBedOptions));
      ({ clickSaveForm } = getUserActions('remoteClusterAdd'));
    });

    test('should have the title of the page set correctly', () => {
      expect(exists('remoteClusterAddPageTitle')).toBe(true);
      expect(find('remoteClusterAddPageTitle').text()).toEqual('Add remote cluster');
    });

    test('should have a link to the documentation', () => {
      expect(exists('remoteClusterDocsButton')).toBe(true);
    });

    test('should display errors and disable the save button when clicking "save" without filling the form', () => {
      expect(exists('remoteClusterFormGlobalError')).toBe(false);
      expect(find('remoteClusterFormSaveButton').props().disabled).toBe(false);

      clickSaveForm();

      expect(exists('remoteClusterFormGlobalError')).toBe(true);
      expect(getFormErrorsMessages()).toEqual([
        'Name is required.',
        'At least one seed node is required.',
      ]);
      expect(find('remoteClusterFormSaveButton').props().disabled).toBe(true);
    });
  });

  describe('form validation', () => {
    describe('remote cluster name', () => {
      let component;
      let getUserActions;
      let form;
      let getFormErrorsMessages;
      let clickSaveForm;

      beforeEach(async () => {
        ({ component, form, getUserActions, getFormErrorsMessages } = initTestBed(RemoteClusterAdd, undefined, testBedOptions));
        ({ clickSaveForm } = getUserActions('remoteClusterAdd'));

        await nextTick();
        component.update();
      });

      test('should not allow spaces', () => {
        form.setInputValue('remoteClusterFormNameInput', 'with space');
        clickSaveForm();
        expect(getFormErrorsMessages()).toContain('Spaces are not allowed in the name.');
      });

      test('should only allow alpha-numeric characters, "-" (dash) and "_" (underscore)', () => {
        const expectInvalidChar = (char) => {
          try {
            form.setInputValue('remoteClusterFormNameInput', `with${char}`);
            expect(getFormErrorsMessages()).toContain(`Remove the character ${char} from the name.`);
          } catch {
            throw Error(`Char "${char}" expected invalid but was allowed`);
          }
        };

        const nonAlphaNumericChars = [
          '#', '@', '.', '$', '*', '(', ')', '+', ';', '~', ':', '\'', '/', '%', '?', ',', '=', '&', '!',
        ];

        const accentedChars = ['À', 'à', 'Á', 'á', 'Â', 'â', 'Ã', 'ã', 'Ä', 'ä', 'Ç', 'ç', 'È', 'è', 'É', 'é', 'Ê', 'ê', 'Ë', 'ë', 'Ì',
          'ì', 'Í', 'í', 'Î', 'î', 'Ï', 'ï', 'Ñ', 'ñ', 'Ò', 'ò', 'Ó', 'ó', 'Ô', 'ô', 'Õ', 'õ', 'Ö', 'ö', 'Š', 'š', 'Ú', 'ù', 'Û', 'ú',
          'Ü', 'û', 'Ù', 'ü', 'Ý', 'ý', 'Ÿ', 'ÿ', 'Ž', 'ž'];

        clickSaveForm(); // display form errors

        [...nonAlphaNumericChars, ...accentedChars].forEach(expectInvalidChar);
      });
    });

    // describe('remote clusters', () => {
    //   describe('when no remote clusters were found', () => {
    //     test('should indicate it and have a button to add one', async () => {
    //       setLoadRemoteClusteresResponse([]);

    //       ({ find, component } = initTestBed(RemoteClusterAdd, undefined, testBedOptions));
    //       await nextTick();
    //       component.update();
    //       const errorCallOut = find('remoteClusterFieldNoClusterFoundError');

    //       expect(errorCallOut.length).toBe(1);
    //       expect(findTestSubject(errorCallOut, 'ccrRemoteClusterAddButton').length).toBe(1);
    //     });
    //   });

    //   describe('when there was an error loading the remote clusters', () => {
    //     test('should also indicate it and have a button to add one', async () => {
    //       setLoadRemoteClusteresResponse(undefined, { body: 'Houston we got a problem' });

    //       ({ find, component } = initTestBed(RemoteClusterAdd, undefined, testBedOptions));
    //       await nextTick();
    //       component.update();
    //       const errorCallOut = find('remoteClusterFieldNoClusterFoundError');

    //       expect(errorCallOut.length).toBe(1);
    //       expect(findTestSubject(errorCallOut, 'ccrRemoteClusterAddButton').length).toBe(1);
    //     });
    //   });

    //   describe('when none of the remote clusters is connected', () => {
    //     const clusterName = 'new-york';
    //     const remoteClusters = [{
    //       name: clusterName,
    //       seeds: ['localhost:9600'],
    //       isConnected: false,
    //     }];

    //     beforeEach(async () => {
    //       setLoadRemoteClusteresResponse(remoteClusters);

    //       ({ find, exists, component } = initTestBed(RemoteClusterAdd, undefined, testBedOptions));
    //       await nextTick();
    //       component.update();
    //     });

    //     test('should show a callout warning and have a button to edit the cluster', () => {
    //       const errorCallOut = find('remoteClusterFieldCallOutError');

    //       expect(errorCallOut.length).toBe(1);
    //       expect(errorCallOut.find('.euiCallOutHeader__title').text()).toBe(`Remote cluster '${clusterName}' is not connected`);
    //       expect(findTestSubject(errorCallOut, 'ccrRemoteClusterEditButton').length).toBe(1);
    //     });

    //     test('should have a button to add another remote cluster', () => {
    //       expect(exists('ccrRemoteClusterInlineAddButton')).toBe(true);
    //     });

    //     test('should indicate in the select option that the cluster is not connected', () => {
    //       const selectOptions = find('ccrRemoteClusterSelect').find('option');
    //       expect(selectOptions.at(0).text()).toBe(`${clusterName} (not connected)`);
    //     });
    //   });
  });

  //   describe('index patterns', () => {
  //     beforeEach(async () => {
  //       ({ component, form, getUserActions, getFormErrorsMessages } = initTestBed(RemoteClusterAdd, undefined, testBedOptions));
  //       ({ clickSaveForm } = getUserActions('autoFollowPatternForm'));

  //       await nextTick();
  //       component.update();
  //     });

  //     test('should not allow spaces', () => {
  //       expect(getFormErrorsMessages()).toEqual([]);

  //       form.setIndexPatternValue('with space');

  //       expect(getFormErrorsMessages()).toContain('Spaces are not allowed in the index pattern.');
  //     });

  //     test('should not allow invalid characters', () => {
  //       const expectInvalidChar = (char) => {
  //         form.setIndexPatternValue(`with${char}space`);
  //         expect(getFormErrorsMessages()).toContain(`Remove the character ${char} from the index pattern.`);
  //       };

  //       return INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE.reduce((promise, char) => {
  //         return promise.then(() => expectInvalidChar(char));
  //       }, Promise.resolve());
  //     });
  //   });
  // });

  // describe('generated indices preview', () => {
  //   beforeEach(async () => {
  //     ({ exists, find, component, form, getUserActions } = initTestBed(RemoteClusterAdd, undefined, testBedOptions));
  //     ({ clickSaveForm } = getUserActions('autoFollowPatternForm'));

  //     await nextTick();
  //     component.update();
  //   });

  //   test('should display a preview of the possible indices generated by the remote cluster', () => {
  //     expect(exists('ccrAutoFollowPatternIndicesPreview')).toBe(false);

  //     form.setIndexPatternValue('kibana-');

  //     expect(exists('ccrAutoFollowPatternIndicesPreview')).toBe(true);
  //   });

  //   test('should display 3 indices example when providing a wildcard(*)', () => {
  //     form.setIndexPatternValue('kibana-*');
  //     const indicesPreview = find('ccrAutoFollowPatternIndexPreview');

  //     expect(indicesPreview.length).toBe(3);
  //     expect(indicesPreview.at(0).text()).toContain('kibana-');
  //   });

  //   test('should only display 1 index example when *not* providing a wildcard', () => {
  //     form.setIndexPatternValue('kibana');
  //     const indicesPreview = find('ccrAutoFollowPatternIndexPreview');

  //     expect(indicesPreview.length).toBe(1);
  //     expect(indicesPreview.at(0).text()).toEqual('kibana');
  //   });

  //   test('should add the prefix and the suffix to the preview', () => {
  //     const prefix = getRandomString();
  //     const suffix = getRandomString();

  //     form.setIndexPatternValue('kibana');
  //     form.setInputValue('ccrAutoFollowPatternFormPrefixInput', prefix);
  //     form.setInputValue('ccrAutoFollowPatternFormSuffixInput', suffix);

  //     const indicesPreview = find('ccrAutoFollowPatternIndexPreview');
  //     const textPreview = indicesPreview.at(0).text();

  //     expect(textPreview).toContain(prefix);
  //     expect(textPreview).toContain(suffix);
  //   });
  // });
});
