/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SinonFakeServer } from 'sinon';
import { TestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';

import { setupEnvironment, RemoteClustersActions } from '../helpers';
import { setup } from './remote_clusters_add.helpers';
import { NON_ALPHA_NUMERIC_CHARS, ACCENTED_CHARS } from './special_characters';

const notInArray = (array: string[]) => (value: string) => array.indexOf(value) < 0;

let component: TestBed['component'];
let actions: RemoteClustersActions;
let server: SinonFakeServer;

describe('Create Remote cluster', () => {
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

  describe('on component mount', () => {
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

    describe('on prem', () => {
      test('should have a toggle to enable "proxy" mode for a remote cluster', () => {
        expect(actions.connectionModeSwitch.exists()).toBe(true);

        // By default it should be set to "false"
        expect(actions.connectionModeSwitch.isChecked()).toBe(false);

        actions.connectionModeSwitch.toggle();

        expect(actions.connectionModeSwitch.isChecked()).toBe(true);
      });

      test('server name has optional label', () => {
        actions.connectionModeSwitch.toggle();
        expect(actions.serverNameInput.getLabel()).toBe('Server name (optional)');
      });

      test('should display errors and disable the save button when clicking "save" without filling the form', async () => {
        expect(actions.globalErrorExists()).toBe(false);
        expect(actions.saveButton.isDisabled()).toBe(false);

        await actions.saveButton.click();

        expect(actions.globalErrorExists()).toBe(true);
        expect(actions.getErrorMessages()).toEqual([
          'Name is required.',
          // seeds input is switched on by default on prem and is required
          'At least one seed node is required.',
        ]);
        expect(actions.saveButton.isDisabled()).toBe(true);
      });

      test('renders no switch for cloud url input and proxy address + server name input modes', () => {
        expect(actions.cloudUrlSwitch.exists()).toBe(false);
      });
    });
    describe('on cloud', () => {
      beforeEach(async () => {
        await act(async () => {
          ({ actions, component } = await setup(true));
        });

        component.update();
      });

      test('renders a switch between cloud url input and proxy address + server name input for proxy connection', () => {
        expect(actions.cloudUrlSwitch.exists()).toBe(true);
      });

      test('renders no switch between sniff and proxy modes', () => {
        expect(actions.connectionModeSwitch.exists()).toBe(false);
      });
      test('defaults to cloud url input for proxy connection', () => {
        expect(actions.cloudUrlSwitch.isChecked()).toBe(false);
      });
      test('server name has no optional label', () => {
        actions.cloudUrlSwitch.toggle();
        expect(actions.serverNameInput.getLabel()).toBe('Server name');
      });
    });
  });
  describe('form validation', () => {
    describe('remote cluster name', () => {
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
          actions.proxyAddressInput.setValue(`192.16${char}:3000`);
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

        actions.proxyAddressInput.setValue('192.168.1.1');
        expect(actions.getErrorMessages()).toContain('A port is required.');

        actions.proxyAddressInput.setValue('192.168.1.1:abc');
        expect(actions.getErrorMessages()).toContain('A port is required.');
      });
    });

    describe('on prem', () => {
      beforeEach(async () => {
        await act(async () => {
          ({ actions, component } = await setup());
        });

        component.update();

        actions.nameInput.setValue('remote_cluster_test');
      });

      describe('seeds', () => {
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

      test('server name is optional (proxy connection)', () => {
        actions.connectionModeSwitch.toggle();
        actions.saveButton.click();
        expect(actions.getErrorMessages()).toEqual(['A proxy address is required.']);
      });
    });

    describe('on cloud', () => {
      beforeEach(async () => {
        await act(async () => {
          ({ actions, component } = await setup(true));
        });

        component.update();
      });

      test('cloud url is required since cloud url input is enabled by default', () => {
        actions.saveButton.click();
        expect(actions.getErrorMessages()).toContain('A url is required.');
      });

      test('proxy address and server name are required when cloud url input is disabled', () => {
        actions.cloudUrlSwitch.toggle();
        actions.saveButton.click();
        expect(actions.getErrorMessages()).toEqual([
          'Name is required.',
          'A proxy address is required.',
          'A server name is required.',
        ]);
      });
    });
  });
});
