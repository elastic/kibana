/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act } from 'react-dom/test-utils';

import { setupEnvironment } from '../helpers';
import { NON_ALPHA_NUMERIC_CHARS, ACCENTED_CHARS } from './special_characters';
import { setup } from './remote_clusters_add.helpers';

describe('Create Remote cluster', () => {
  describe('on component mount', () => {
    let find;
    let exists;
    let actions;
    let form;
    let server;
    let component;

    beforeAll(() => {
      ({ server } = setupEnvironment());
    });

    afterAll(() => {
      server.restore();
    });

    beforeEach(async () => {
      await act(async () => {
        ({ form, exists, find, actions, component } = setup());
      });
      component.update();
    });

    test('should have the title of the page set correctly', () => {
      expect(exists('remoteClusterPageTitle')).toBe(true);
      expect(find('remoteClusterPageTitle').text()).toEqual('Add remote cluster');
    });

    test('should have a link to the documentation', () => {
      expect(exists('remoteClusterDocsButton')).toBe(true);
    });

    test('should have a toggle to Skip unavailable remote cluster', () => {
      expect(exists('remoteClusterFormSkipUnavailableFormToggle')).toBe(true);

      // By default it should be set to "false"
      expect(find('remoteClusterFormSkipUnavailableFormToggle').props()['aria-checked']).toBe(
        false
      );

      act(() => {
        form.toggleEuiSwitch('remoteClusterFormSkipUnavailableFormToggle');
      });

      component.update();

      expect(find('remoteClusterFormSkipUnavailableFormToggle').props()['aria-checked']).toBe(true);
    });

    test('should have a toggle to enable "proxy" mode for a remote cluster', () => {
      expect(exists('remoteClusterFormConnectionModeToggle')).toBe(true);

      // By default it should be set to "false"
      expect(find('remoteClusterFormConnectionModeToggle').props()['aria-checked']).toBe(false);

      act(() => {
        form.toggleEuiSwitch('remoteClusterFormConnectionModeToggle');
      });

      component.update();

      expect(find('remoteClusterFormConnectionModeToggle').props()['aria-checked']).toBe(true);
    });

    test('should display errors and disable the save button when clicking "save" without filling the form', async () => {
      expect(exists('remoteClusterFormGlobalError')).toBe(false);
      expect(find('remoteClusterFormSaveButton').props().disabled).toBe(false);

      await actions.clickSaveForm();

      expect(exists('remoteClusterFormGlobalError')).toBe(true);
      expect(form.getErrorsMessages()).toEqual([
        'Name is required.',
        'At least one seed node is required.',
      ]);
      expect(find('remoteClusterFormSaveButton').props().disabled).toBe(true);
    });
  });

  describe('form validation', () => {
    describe('remote cluster name', () => {
      let component;
      let actions;
      let form;

      beforeEach(async () => {
        await act(async () => {
          ({ component, form, actions } = setup());
        });

        component.update();
      });

      test('should not allow spaces', async () => {
        form.setInputValue('remoteClusterFormNameInput', 'with space');

        await actions.clickSaveForm();

        expect(form.getErrorsMessages()).toContain('Spaces are not allowed in the name.');
      });

      test('should only allow alpha-numeric characters, "-" (dash) and "_" (underscore)', async () => {
        const expectInvalidChar = (char) => {
          if (char === '-' || char === '_') {
            return;
          }

          try {
            form.setInputValue('remoteClusterFormNameInput', `with${char}`);

            expect(form.getErrorsMessages()).toContain(
              `Remove the character ${char} from the name.`
            );
          } catch {
            throw Error(`Char "${char}" expected invalid but was allowed`);
          }
        };

        await actions.clickSaveForm(); // display form errors

        [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS].forEach(expectInvalidChar);
      });
    });

    describe('seeds', () => {
      let actions;
      let form;
      let component;

      beforeEach(async () => {
        await act(async () => {
          ({ form, actions, component } = setup());
        });

        component.update();

        form.setInputValue('remoteClusterFormNameInput', 'remote_cluster_test');
      });

      test('should only allow alpha-numeric characters and "-" (dash) in the node "host" part', async () => {
        await actions.clickSaveForm(); // display form errors

        const notInArray = (array) => (value) => array.indexOf(value) < 0;

        const expectInvalidChar = (char) => {
          form.setComboBoxValue('remoteClusterFormSeedsInput', `192.16${char}:3000`);
          expect(form.getErrorsMessages()).toContain(
            `Seed node must use host:port format. Example: 127.0.0.1:9400, localhost:9400. Hosts can only consist of letters, numbers, and dashes.`
          );
        };

        [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS]
          .filter(notInArray(['-', '_', ':']))
          .forEach(expectInvalidChar);
      });

      test('should require a numeric "port" to be set', async () => {
        await actions.clickSaveForm();

        form.setComboBoxValue('remoteClusterFormSeedsInput', '192.168.1.1');
        expect(form.getErrorsMessages()).toContain('A port is required.');

        form.setComboBoxValue('remoteClusterFormSeedsInput', '192.168.1.1:abc');
        expect(form.getErrorsMessages()).toContain('A port is required.');
      });
    });

    describe('proxy address', () => {
      let actions;
      let form;
      let component;

      beforeEach(async () => {
        await act(async () => {
          ({ form, actions, component } = setup());
        });

        component.update();

        act(() => {
          // Enable "proxy" mode
          form.toggleEuiSwitch('remoteClusterFormConnectionModeToggle');
        });

        component.update();
      });

      test('should only allow alpha-numeric characters and "-" (dash) in the proxy address "host" part', async () => {
        await actions.clickSaveForm(); // display form errors

        const notInArray = (array) => (value) => array.indexOf(value) < 0;

        const expectInvalidChar = (char) => {
          form.setInputValue('remoteClusterFormProxyAddressInput', `192.16${char}:3000`);
          expect(form.getErrorsMessages()).toContain(
            'Address must use host:port format. Example: 127.0.0.1:9400, localhost:9400. Hosts can only consist of letters, numbers, and dashes.'
          );
        };

        [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS]
          .filter(notInArray(['-', '_', ':']))
          .forEach(expectInvalidChar);
      });

      test('should require a numeric "port" to be set', async () => {
        await actions.clickSaveForm();

        form.setInputValue('remoteClusterFormProxyAddressInput', '192.168.1.1');
        expect(form.getErrorsMessages()).toContain('A port is required.');

        form.setInputValue('remoteClusterFormProxyAddressInput', '192.168.1.1:abc');
        expect(form.getErrorsMessages()).toContain('A port is required.');
      });
    });
  });
});
