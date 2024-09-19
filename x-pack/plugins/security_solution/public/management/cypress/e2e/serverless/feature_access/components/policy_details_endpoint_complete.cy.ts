/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexedFleetEndpointPolicyResponse } from '../../../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { login } from '../../../../tasks/login';
import { loadPage } from '../../../../tasks/common';
import { APP_POLICIES_PATH } from '../../../../../../../common/constants';

describe(
  'When displaying the Policy Details in Endpoint Essentials PLI',
  {
    tags: ['@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'complete' },
        ],
      },
    },
  },
  () => {
    let loadedPolicyData: IndexedFleetEndpointPolicyResponse;
    let policyId: string;

    before(() => {
      cy.task(
        'indexFleetEndpointPolicy',
        { policyName: 'tests-serverless' },
        { timeout: 5 * 60 * 1000 }
      ).then((res) => {
        const response = res as IndexedFleetEndpointPolicyResponse;
        loadedPolicyData = response;
        policyId = response.integrationPolicies[0].id;
      });
    });

    after(() => {
      if (loadedPolicyData) {
        cy.task('deleteIndexedFleetEndpointPolicies', loadedPolicyData);
      }
    });

    beforeEach(() => {
      login();
    });

    it('should not display upselling section for protection updates', () => {
      loadPage(`${APP_POLICIES_PATH}/${policyId}/protectionUpdates`);
      [
        'endpointPolicy-protectionUpdatesLockedCard-title',
        'endpointPolicy-protectionUpdatesLockedCard',
        'endpointPolicy-protectionUpdatesLockedCard-badge',
      ].forEach((testSubj) => {
        cy.getByTestSubj(testSubj).should('not.exist');
      });
      [
        'protection-updates-warning-callout',
        'protection-updates-automatic-updates-enabled',
        'protection-updates-manifest-switch',
        'protection-updates-manifest-name-title',
      ].forEach((testSubj) => {
        cy.getByTestSubj(testSubj).should('exist').and('be.visible');
      });
    });

    it(`should not display upselling section for custom notification`, () => {
      const testData = ['malware', 'ransomware', 'memory', 'behaviour'];

      loadPage(`${APP_POLICIES_PATH}/${policyId}/settings`);

      testData.forEach((protection) => {
        cy.getByTestSubj(`endpointPolicyForm-${protection}`).within(() => {
          cy.getByTestSubj(`endpointPolicyForm-${protection}-enableDisableSwitch`).click();

          [
            'endpointPolicy-customNotificationLockedCard-title',
            'endpointPolicy-customNotificationLockedCard',
            'endpointPolicy-customNotificationLockedCard-badge',
          ].forEach((testSubj) => {
            cy.getByTestSubj(testSubj).should('not.exist');
          });
          cy.getByTestSubj(`endpointPolicyForm-${protection}-notifyUser-customMessage`)
            .should('exist')
            .and('be.visible');
        });
      });
    });
  }
);

// {"version":"WzE2NjgsMV0=","name":"avc","namespace":"","description":"","package":{"name":"endpoint","title":"Elastic Defend","version":"8.15.1","requires_root":true},"enabled":true,"policy_id":"06a370eb-412e-4bff-9e94-2c6a65937e4b","policy_ids":["06a370eb-412e-4bff-9e94-2c6a65937e4b"],"inputs":[{"type":"endpoint","enabled":true,"streams":[],"config":{"integration_config":{"value":{"type":"endpoint","endpointConfig":{"preset":"EDRComplete"}}},"artifact_manifest":{"value":{"manifest_version":"1.0.0","schema_version":"v1","artifacts":{"endpoint-exceptionlist-macos-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-exceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-exceptionlist-windows-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-exceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-exceptionlist-linux-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-exceptionlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-trustlist-macos-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-trustlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-trustlist-windows-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-trustlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-trustlist-linux-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-trustlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-eventfilterlist-macos-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-eventfilterlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-eventfilterlist-windows-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-eventfilterlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-eventfilterlist-linux-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-eventfilterlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-hostisolationexceptionlist-macos-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-hostisolationexceptionlist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-hostisolationexceptionlist-windows-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-hostisolationexceptionlist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-hostisolationexceptionlist-linux-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-hostisolationexceptionlist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-blocklist-macos-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-blocklist-macos-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-blocklist-windows-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-blocklist-windows-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"},"endpoint-blocklist-linux-v1":{"encryption_algorithm":"none","decoded_sha256":"d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","decoded_size":14,"encoded_sha256":"f8e6afa1d5662f5b37f83337af774b5785b5b7f1daee08b7b00c2d6813874cda","encoded_size":22,"relative_url":"/api/fleet/artifacts/endpoint-blocklist-linux-v1/d801aa1fb7ddcc330a5e3173372ea6af4a3d08ec58074478e85aa5603e926658","compression_algorithm":"zlib"}}}},"policy":{"value":{"meta":{"license":"enterprise","license_uuid":"d85d2c6a-b96d-3cc6-96db-5571a789b156","cluster_uuid":"fTYcSqO2RyyeAggzNbkYTw","cluster_name":"","cloud":false,"serverless":false,"billable":false},"global_manifest_version":"latest","windows":{"events":{"credential_access":true,"dll_and_driver_load":true,"dns":true,"file":true,"network":true,"process":true,"registry":true,"security":true},"malware":{"mode":"prevent","blocklist":true,"on_write_scan":true},"ransomware":{"mode":"prevent","supported":true},"memory_protection":{"mode":"prevent","supported":true},"behavior_protection":{"mode":"prevent","reputation_service":false,"supported":true},"popup":{"malware":{"message":"Hi there.","enabled":true},"ransomware":{"message":"LUL","enabled":true},"memory_protection":{"message":"Elastic Security {action} {rule}","enabled":true},"behavior_protection":{"message":"Elastic Security {action} {rule}","enabled":true}},"logging":{"file":"info"},"antivirus_registration":{"mode":"sync_with_malware_prevent","enabled":true},"attack_surface_reduction":{"credential_hardening":{"enabled":true}}},"mac":{"events":{"process":true,"file":true,"network":true},"malware":{"mode":"prevent","blocklist":true,"on_write_scan":true},"behavior_protection":{"mode":"prevent","reputation_service":false,"supported":true},"memory_protection":{"mode":"prevent","supported":true},"popup":{"malware":{"message":"Hi there.","enabled":true},"behavior_protection":{"message":"Elastic Security {action} {rule}","enabled":true},"memory_protection":{"message":"Elastic Security {action} {rule}","enabled":true}},"logging":{"file":"info"},"advanced":{"capture_env_vars":"DYLD_INSERT_LIBRARIES,DYLD_FRAMEWORK_PATH,DYLD_LIBRARY_PATH,LD_PRELOAD"}},"linux":{"events":{"process":true,"file":true,"network":true,"session_data":false,"tty_io":false},"malware":{"mode":"prevent","blocklist":true,"on_write_scan":true},"behavior_protection":{"mode":"prevent","reputation_service":false,"supported":true},"memory_protection":{"mode":"prevent","supported":true},"popup":{"malware":{"message":"Hi there.","enabled":true},"behavior_protection":{"message":"Elastic Security {action} {rule}","enabled":true},"memory_protection":{"message":"Elastic Security {action} {rule}","enabled":true}},"logging":{"file":"info"},"advanced":{"capture_env_vars":"LD_PRELOAD,LD_LIBRARY_PATH"}}}}}}],"output_id":null}
// http://localhost:5601/api/fleet/package_policies/efe44e0f-0d63-4e2b-a799-56bbf65f801f
