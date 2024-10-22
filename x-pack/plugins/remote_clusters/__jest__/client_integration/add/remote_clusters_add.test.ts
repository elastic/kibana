/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestBed } from '@kbn/test-jest-helpers';
import { act } from 'react-dom/test-utils';

import { setupEnvironment, RemoteClustersActions } from '../helpers';
import { setup } from './remote_clusters_add.helpers';
import { NON_ALPHA_NUMERIC_CHARS, ACCENTED_CHARS } from './special_characters';
import { MAX_NODE_CONNECTIONS } from '../../../common/constants';

const notInArray = (array: string[]) => (value: string) => array.indexOf(value) < 0;

let component: TestBed['component'];
let actions: RemoteClustersActions;

describe('Create Remote cluster', () => {
  const { httpSetup } = setupEnvironment();

  beforeEach(async () => {
    await act(async () => {
      ({ actions, component } = await setup(httpSetup));
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

      // By default it should be set to "true"
      expect(actions.skipUnavailableSwitch.isChecked()).toBe(true);

      actions.skipUnavailableSwitch.toggle();

      expect(actions.skipUnavailableSwitch.isChecked()).toBe(false);
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

      test('renders no switch for cloud advanced options', () => {
        expect(actions.cloudAdvancedOptionsSwitch.exists()).toBe(false);
      });
    });
    describe('on cloud', () => {
      beforeEach(async () => {
        await act(async () => {
          ({ actions, component } = await setup(httpSetup, { isCloudEnabled: true }));
        });

        component.update();
      });

      test('TLS server name has optional label', () => {
        actions.cloudAdvancedOptionsSwitch.toggle();
        expect(actions.tlsServerNameInput.getLabel()).toBe('TLS server name (optional)');
      });

      test('renders a switch for advanced options', () => {
        expect(actions.cloudAdvancedOptionsSwitch.exists()).toBe(true);
      });

      test('renders no switch between sniff and proxy modes', () => {
        expect(actions.connectionModeSwitch.exists()).toBe(false);
      });

      test('advanced options are initially disabled', () => {
        expect(actions.cloudAdvancedOptionsSwitch.isChecked()).toBe(false);
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
          ({ actions, component } = await setup(httpSetup));
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

    describe('Setup Trust', () => {
      beforeEach(async () => {
        await act(async () => {
          ({ actions, component } = await setup(httpSetup, {
            canUseAPIKeyTrustModel: true,
          }));
        });

        component.update();

        actions.nameInput.setValue('remote_cluster_test');
        actions.seedsInput.setValue('192.168.1.1:3000');

        await actions.saveButton.click();
      });

      test('should contain two cards for setting up trust', () => {
        // Cards exist
        expect(actions.setupTrust.apiCardExist()).toBe(true);
        expect(actions.setupTrust.certCardExist()).toBe(true);
        // Each card has its doc link
        expect(actions.setupTrust.apiCardDocsExist()).toBe(true);
        expect(actions.setupTrust.certCardDocsExist()).toBe(true);
      });

      test('on submit should open confirm modal', async () => {
        await actions.setupTrust.setupTrustConfirmClick();

        expect(actions.setupTrust.isSubmitInConfirmDisabled()).toBe(true);
        await actions.setupTrust.toggleConfirmSwitch();
        expect(actions.setupTrust.isSubmitInConfirmDisabled()).toBe(false);
      });

      test('back button goes to first step', async () => {
        await actions.setupTrust.backToFirstStepClick();
        expect(actions.isOnFirstStep()).toBe(true);
      });

      test('shows only cert based config if API key trust model is not available', async () => {
        await act(async () => {
          ({ actions, component } = await setup(httpSetup, {
            canUseAPIKeyTrustModel: false,
          }));
        });

        component.update();

        actions.nameInput.setValue('remote_cluster_test');
        actions.seedsInput.setValue('192.168.1.1:3000');

        await actions.saveButton.click();

        expect(actions.setupTrust.apiCardExist()).toBe(false);
        expect(actions.setupTrust.certCardExist()).toBe(true);
      });
    });

    describe('on prem', () => {
      beforeEach(async () => {
        await act(async () => {
          ({ actions, component } = await setup(httpSetup));
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

      describe('node connections', () => {
        test('should require a valid number of node connections', async () => {
          await actions.saveButton.click();

          actions.nodeConnectionsInput.setValue(String(MAX_NODE_CONNECTIONS + 1));
          expect(actions.getErrorMessages()).toContain(
            `This number must be equal or less than ${MAX_NODE_CONNECTIONS}.`
          );
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
          ({ actions, component } = await setup(httpSetup, { isCloudEnabled: true }));
        });

        component.update();
      });

      test('remote address is required', () => {
        actions.saveButton.click();
        expect(actions.getErrorMessages()).toContain('A remote address is required.');
      });

      test('should only allow alpha-numeric characters and "-" (dash) in the remote address "host" part', async () => {
        await actions.saveButton.click(); // display form errors

        const expectInvalidChar = (char: string) => {
          actions.cloudRemoteAddressInput.setValue(`192.16${char}:3000`);
          expect(actions.getErrorMessages()).toContain('Remote address is invalid.');
        };

        [...NON_ALPHA_NUMERIC_CHARS, ...ACCENTED_CHARS]
          .filter(notInArray(['-', '_', ':']))
          .forEach(expectInvalidChar);
      });
    });
  });
});
