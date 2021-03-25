/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SinonFakeServer } from 'sinon';
import { TestBed } from '@kbn/test/jest';
import { act } from 'react-dom/test-utils';

import { setupEnvironment, RemoteClustersActions } from '../helpers';
import { setup } from './remote_clusters_add.helpers';
import { NON_ALPHA_NUMERIC_CHARS, ACCENTED_CHARS } from './special_characters';

const notInArray = (array: string[]) => (value: string) => array.indexOf(value) < 0;

let component: TestBed['component'];
let actions: RemoteClustersActions;
let server: SinonFakeServer;

describe('Create Remote cluster', () => {
  describe('on prem', () => {
    describe('on component mount', () => {
      beforeAll(() => {
        ({ server } = setupEnvironment());
      });

      afterAll(() => {
        server.restore();
      });

      beforeEach(async () => {
        await act(async () => {
          ({ actions, component } = await setup());
        });
        component.update();
      });

      test('should have the title of the page set correctly', () => {
        expect(actions.pageTitle.exists()).toBe(true);
        expect(actions.pageTitle.text()).toEqual('Add remote cluster');
      });

      test('should have a link to the documentation', () => {
        expect(actions.docsButtonExists()).toBe(true);
      });

      test('should have a toggle to Skip unavailable remote cluster', () => {
        expect(actions.skipUnavailableSwitch.exists()).toBe(true);

        // By default it should be set to "false"
        expect(actions.skipUnavailableSwitch.isChecked()).toBe(false);

        actions.skipUnavailableSwitch.toggle();

        expect(actions.skipUnavailableSwitch.isChecked()).toBe(true);
      });

      test('should have a toggle to enable "proxy" mode for a remote cluster', () => {
        expect(actions.connectionModeSwitch.exists()).toBe(true);

        // By default it should be set to "false"
        expect(actions.connectionModeSwitch.isChecked()).toBe(false);

        actions.connectionModeSwitch.toggle();

        expect(actions.connectionModeSwitch.isChecked()).toBe(true);
      });

      test('server name is optional', () => {
        actions.connectionModeSwitch.toggle();
        expect(actions.serverNameInput.label()).toBe('Server name (optional)');
      });

      test('should display errors and disable the save button when clicking "save" without filling the form', async () => {
        expect(actions.globalErrorExists()).toBe(false);
        expect(actions.saveButton.isDisabled()).toBe(false);

        await actions.saveButton.click();

        expect(actions.globalErrorExists()).toBe(true);
        expect(actions.getErrorMessages()).toEqual([
          'Name is required.',
          'At least one seed node is required.',
        ]);
        expect(actions.saveButton.isDisabled()).toBe(true);
      });

      test('renders no switch for cloud and manual modes', () => {
        expect(actions.cloudUrlSwitch.exists()).toBe(false);
      });
    });

    describe('form validation', () => {
      describe('remote cluster name', () => {
        beforeEach(async () => {
          await act(async () => {
            ({ component, actions } = await setup());
          });

          component.update();
        });

        test('should not allow spaces', async () => {
          actions.nameInput.setValue('with space');

          await actions.saveButton.click();

          expect(actions.getErrorMessages()).toContain('Spaces are not allowed in the name.');
        });

        test('should only allow alpha-numeric characters, "-" (dash) and "_" (underscore)', async () => {
          const expectInvalidChar = (char: string) => {
            if (char === '-' || char === '_') {
              return;
            }

            try {
              actions.nameInput.setValue(`with${char}`);

              expect(actions.getErrorMessages()).toContain(
                `Remove the character ${char} from the name.`
              );
            } catch {
              throw Error(`Char "${char}" expected invalid but was allowed`);
            }
          };

          await actions.saveButton.click(); // display form errors

          [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS].forEach(expectInvalidChar);
        });
      });

      describe('seeds', () => {
        beforeEach(async () => {
          await act(async () => {
            ({ actions, component } = await setup());
          });

          component.update();

          actions.nameInput.setValue('remote_cluster_test');
        });

        test('should only allow alpha-numeric characters and "-" (dash) in the node "host" part', async () => {
          await actions.saveButton.click(); // display form errors

          const expectInvalidChar = (char: string) => {
            actions.seedsInput.setValue(`192.16${char}:3000`);
            expect(actions.getErrorMessages()).toContain(
              `Seed node must use host:port format. Example: 127.0.0.1:9400, localhost:9400. Hosts can only consist of letters, numbers, and dashes.`
            );
          };

          [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS]
            .filter(notInArray(['-', '_', ':']))
            .forEach(expectInvalidChar);
        });

        test('should require a numeric "port" to be set', async () => {
          await actions.saveButton.click();

          actions.seedsInput.setValue('192.168.1.1');
          expect(actions.getErrorMessages()).toContain('A port is required.');

          actions.seedsInput.setValue('192.168.1.1:abc');
          expect(actions.getErrorMessages()).toContain('A port is required.');
        });
      });

      describe('proxy address', () => {
        beforeEach(async () => {
          await act(async () => {
            ({ actions, component } = await setup());
          });

          component.update();

          actions.connectionModeSwitch.toggle();
        });

        test('should only allow alpha-numeric characters and "-" (dash) in the proxy address "host" part', async () => {
          await actions.saveButton.click(); // display form errors

          const expectInvalidChar = (char: string) => {
            actions.setProxyAddress(`192.16${char}:3000`);
            expect(actions.getErrorMessages()).toContain(
              'Address must use host:port format. Example: 127.0.0.1:9400, localhost:9400. Hosts can only consist of letters, numbers, and dashes.'
            );
          };

          [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS]
            .filter(notInArray(['-', '_', ':']))
            .forEach(expectInvalidChar);
        });

        test('should require a numeric "port" to be set', async () => {
          await actions.saveButton.click();

          actions.setProxyAddress('192.168.1.1');
          expect(actions.getErrorMessages()).toContain('A port is required.');

          actions.setProxyAddress('192.168.1.1:abc');
          expect(actions.getErrorMessages()).toContain('A port is required.');
        });
      });
    });
  });
  describe('on cloud', () => {
    beforeEach(async () => {
      await act(async () => {
        ({ actions, component } = await setup(true));
      });

      component.update();
    });

    test('renders a switch for cloud and manual modes', () => {
      expect(actions.cloudUrlSwitch.exists()).toBe(true);
    });

    test('renders no switch for sniff and proxy modes', () => {
      expect(actions.connectionModeSwitch.exists()).toBe(false);
    });
    test('new cluster defaults to cloud url', () => {
      expect(actions.cloudUrlSwitch.isChecked()).toBe(false);
    });

    describe('validation', () => {
      test('cloud url is required', () => {
        actions.saveButton.click();
        expect(actions.getErrorMessages()).toContain('A url is required.');
      });
      test('server name is required', () => {
        actions.cloudUrlSwitch.toggle();
        expect(actions.serverNameInput.label()).toBe('Server name');
      });
      test('proxy address and server name are required when cloud url input is disabled', () => {
        actions.cloudUrlSwitch.toggle();
        actions.saveButton.click();
        expect(actions.getErrorMessages()).toContain('A proxy address is required.');
        expect(actions.getErrorMessages()).toContain('A server name is required.');
      });
    });
  });
});
