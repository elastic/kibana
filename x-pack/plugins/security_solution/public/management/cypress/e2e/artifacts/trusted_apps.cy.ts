/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import {
  createArtifactList,
  createPerPolicyArtifact,
  removeExceptionsList,
  trustedAppsFormSelectors,
} from '../../tasks/artifacts';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import { login } from '../../tasks/login';

const {
  openTrustedApps,
  selectOs,
  openFieldSelector,
  expectedFieldOptions,
  selectField,
  fillOutValueField,
  fillOutTrustedAppsFlyout,
  submitForm,
  validateSuccessPopup,
  validateRenderedCondition,
  clickAndConditionButton,
  validateRenderedConditions,
  deleteTrustedAppItem,
  removeSingleCondition,
  expectAllFieldOptionsRendered,
  expectFieldOptionsNotRendered,
} = trustedAppsFormSelectors;

describe(
  'Trusted Apps',
  {
    tags: ['@ess', '@serverless', '@skipInServerlessMKI'], // @skipInServerlessMKI until kibana is rebuilt after merge
  },
  () => {
    let indexedPolicy: IndexedFleetEndpointPolicyResponse;

    before(() => {
      getEndpointIntegrationVersion().then((version) => {
        createAgentPolicyTask(version).then((data) => {
          indexedPolicy = data;
        });
      });
    });

    beforeEach(() => {
      login();
    });

    after(() => {
      if (indexedPolicy) {
        cy.task('deleteIndexedFleetEndpointPolicies', indexedPolicy);
      }
    });

    const createArtifactBodyRequest = (multiCondition = false) => ({
      list_id: ENDPOINT_ARTIFACT_LISTS.trustedApps.id,
      entries: [
        {
          entries: [
            {
              field: 'trusted',
              operator: 'included',
              type: 'match',
              value: 'true',
            },
            {
              field: 'subject_name',
              value: 'TestSignature',
              type: 'match',
              operator: 'included',
            },
          ],
          field: 'process.code_signature',
          type: 'nested',
        },
        ...(multiCondition
          ? [
              {
                field: 'process.hash.sha1',
                value: '323769d194406183912bb903e7fe738221543348',
                type: 'match',
                operator: 'included',
              },
              {
                field: 'process.executable.caseless',
                value: '/dev/null',
                type: 'match',
                operator: 'included',
              },
            ]
          : []),
      ],
      os_types: ['macos'],
    });

    describe('Renders Trusted Apps form fields', () => {
      it('Correctly renders all blocklist fields for different OSs', () => {
        openTrustedApps({ create: true });
        selectOs('windows');
        expectFieldOptionsNotRendered();
        openFieldSelector();
        expectAllFieldOptionsRendered();

        selectOs('macos');
        expectFieldOptionsNotRendered();
        openFieldSelector();
        expectAllFieldOptionsRendered();

        selectOs('linux');
        expectFieldOptionsNotRendered();
        openFieldSelector();
        expectedFieldOptions(['Path', 'Hash']);
      });
    });

    describe('Handles CRUD with signature field', () => {
      afterEach(() => {
        removeExceptionsList(ENDPOINT_ARTIFACT_LISTS.trustedApps.id);
      });

      it('Correctly creates a trusted app with a single signature field on Mac', () => {
        const expectedCondition = /AND\s*process\.code_signature\s*IS\s*TestSignature/;

        openTrustedApps({ create: true });
        fillOutTrustedAppsFlyout();
        selectOs('macos');
        openFieldSelector();
        selectField();
        fillOutValueField('TestSignature');
        submitForm();
        validateSuccessPopup('create');
        validateRenderedCondition(expectedCondition);
      });

      describe('Correctly updates and deletes Mac os trusted app with single signature field', () => {
        let itemId: string;

        beforeEach(() => {
          createArtifactList(ENDPOINT_ARTIFACT_LISTS.trustedApps.id);
          createPerPolicyArtifact('Test TrustedApp', createArtifactBodyRequest()).then(
            (response) => {
              itemId = response.body.item_id;
            }
          );
        });

        it('Updates Mac os single signature field trusted app item', () => {
          const expectedCondition = /AND\s*process\.code_signature\s*IS\s*TestSignatureNext/;
          openTrustedApps({ itemId });
          fillOutValueField('Next');
          submitForm();
          validateSuccessPopup('update');
          validateRenderedCondition(expectedCondition);
        });

        it('Deletes a blocklist item', () => {
          openTrustedApps();
          deleteTrustedAppItem();
          validateSuccessPopup('delete');
        });
      });

      it('Correctly creates a trusted app with a multiple conditions on Mac', () => {
        const expectedCondition =
          /\s*OSIS\s*Mac\s*AND\s*process\.code_signature\s*IS\s*TestSignature\s*AND\s*process\.hash\.\*\s*IS\s*323769d194406183912bb903e7fe738221543348\s*AND\s*process\.executable\.caselessIS\s*\/dev\/null\s*/;

        openTrustedApps({ create: true });
        fillOutTrustedAppsFlyout();
        selectOs('macos');
        // Set signature field
        openFieldSelector();
        selectField();
        fillOutValueField('TestSignature');
        // Add another condition
        clickAndConditionButton();
        // Set hash field
        openFieldSelector(1, 1);
        selectField('Hash', 1, 1);
        fillOutValueField('323769d194406183912bb903e7fe738221543348', 1, 1);
        // Add another condition
        clickAndConditionButton();
        // Set path field
        openFieldSelector(1, 2);
        selectField('Path', 1, 2);
        fillOutValueField('/dev/null', 1, 2);

        submitForm();
        validateSuccessPopup('create');
        validateRenderedConditions(expectedCondition);
      });

      describe('Correctly updates and deletes Mac os trusted app with multiple conditions', () => {
        let itemId: string;

        beforeEach(() => {
          createArtifactList(ENDPOINT_ARTIFACT_LISTS.trustedApps.id);
          createPerPolicyArtifact('Test TrustedApp', createArtifactBodyRequest(true)).then(
            (response) => {
              itemId = response.body.item_id;
            }
          );
        });

        it('Updates Mac os multiple condition trusted app item', () => {
          const expectedCondition =
            /\s*AND\s*process\.code_signature\s*IS\s*TestSignature\s*AND\s*process\.executable\.caselessIS\s*\/dev\/null\s*/;
          openTrustedApps({ itemId });
          removeSingleCondition(1, 1);
          submitForm();
          validateSuccessPopup('update');
          validateRenderedCondition(expectedCondition);
        });

        it('Deletes a blocklist item', () => {
          openTrustedApps();
          deleteTrustedAppItem();
          validateSuccessPopup('delete');
        });
      });
    });
  }
);
