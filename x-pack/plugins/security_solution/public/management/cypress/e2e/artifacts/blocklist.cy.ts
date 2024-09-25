/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import type { IndexedFleetEndpointPolicyResponse } from '../../../../../common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { login } from '../../tasks/login';
import { createAgentPolicyTask, getEndpointIntegrationVersion } from '../../tasks/fleet';
import {
  blocklistFormSelectors,
  createArtifactList,
  createPerPolicyArtifact,
  removeExceptionsList,
} from '../../tasks/artifacts';

const {
  deleteBlocklistItem,
  validateSuccessPopup,
  submitBlocklist,
  selectOperator,
  validateRenderedCondition,
  fillOutBlocklistFlyout,
  setSingleValue,
  setMultiValue,
  openBlocklist,
  selectPathField,
  selectSignatureField,
  expectSingleOperator,
  expectMultiOperator,
  validateSingleValue,
  validateMultiValue,
  selectHashField,
  selectOs,
  expectSubmitButtonToBe,
  clearMultiValueInput,
} = blocklistFormSelectors;

describe(
  'Blocklist',
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

    const createArtifactBodyRequest = (type: 'match' | 'match_any') => {
      return {
        list_id: ENDPOINT_ARTIFACT_LISTS.blocklists.id,
        entries: [
          {
            entries: [
              {
                field: 'subject_name',
                value: type === 'match' ? 'Elastic, Inc.' : ['Elastic', 'Inc.'],
                type,
                operator: 'included',
              },
            ],
            field: 'file.Ext.code_signature',
            type: 'nested',
          },
        ],
        os_types: ['windows'],
      };
    };

    describe('Renders blocklist fields', () => {
      it('Correctly renders all blocklist fields for different OSs', () => {
        openBlocklist({ create: true });

        selectOs('windows');

        selectPathField();
        expectSingleOperator('Path');
        selectSignatureField();
        expectMultiOperator('Signature');
        selectHashField();
        expectSingleOperator('Hash');

        selectOs('linux');

        selectPathField(false);
        expectSingleOperator('Path');
        selectHashField();
        expectSingleOperator('Hash');

        selectOs('macos');

        selectPathField();
        expectSingleOperator('Path');
        selectHashField();
        expectSingleOperator('Hash');
      });

      it('Correctly modifies value format based on field selection', () => {
        openBlocklist({ create: true });
        // Start with default is one of operator
        selectSignatureField();
        expectMultiOperator('Signature', 'is one of');
        setMultiValue();
        validateMultiValue();
        // Switch to is operator
        selectOperator('is');
        expectMultiOperator('Signature', 'is');
        validateSingleValue();
        // Switch to different Field to reset value to multi value again
        selectPathField();
        expectSingleOperator('Path');
        validateMultiValue();
      });

      it('Correctly validates value input', () => {
        openBlocklist({ create: true });
        fillOutBlocklistFlyout();
        selectSignatureField();

        expectSubmitButtonToBe('disabled');

        selectOperator('is');
        selectOperator('is');
        validateSingleValue('');
        expectSubmitButtonToBe('disabled');

        selectOperator('is one of');
        selectOperator('is one of');
        validateMultiValue({ empty: true });

        selectOperator('is');
        selectOperator('is');
        validateSingleValue('');
        expectSubmitButtonToBe('disabled');

        setSingleValue();
        validateSingleValue();
        expectSubmitButtonToBe('enabled');

        selectOperator('is one of');
        validateMultiValue();
        expectSubmitButtonToBe('enabled');

        selectOperator('is one of');
        validateMultiValue();
        expectSubmitButtonToBe('enabled');

        clearMultiValueInput();
        expectSubmitButtonToBe('disabled');

        selectOperator('is');
        validateSingleValue('');
        expectSubmitButtonToBe('disabled');
      });
    });

    describe('Handles CRUD with operator field', () => {
      const IS_EXPECTED_CONDITION = /AND\s*file.Ext.code_signature\s*IS\s*Elastic,\s*Inc./;
      const IS_ONE_OF_EXPECTED_CONDITION =
        /AND\s*file.Ext.code_signature\s*is\s*one\s*of\s*Elastic\s*Inc./;

      afterEach(() => {
        removeExceptionsList(ENDPOINT_ARTIFACT_LISTS.blocklists.id);
      });

      it('Create a blocklist item with single operator', () => {
        openBlocklist({ create: true });
        fillOutBlocklistFlyout();
        selectSignatureField();
        selectOperator('is');
        setSingleValue();
        submitBlocklist();
        validateSuccessPopup('create');
        validateRenderedCondition(IS_EXPECTED_CONDITION);
      });

      it('Create a blocklist item with multi operator', () => {
        openBlocklist({ create: true });
        fillOutBlocklistFlyout();
        selectSignatureField();
        selectOperator('is one of');
        setMultiValue();
        submitBlocklist();
        validateSuccessPopup('create');
        validateRenderedCondition(IS_ONE_OF_EXPECTED_CONDITION);
      });

      describe('Updates and deletes blocklist match_any item', () => {
        let itemId: string;

        beforeEach(() => {
          createArtifactList(ENDPOINT_ARTIFACT_LISTS.blocklists.id);
          createPerPolicyArtifact('Test Blocklist', createArtifactBodyRequest('match_any')).then(
            (response) => {
              itemId = response.body.item_id;
            }
          );
        });

        it('Updates a match_any blocklist item', () => {
          openBlocklist({ itemId });
          selectOperator('is');
          submitBlocklist();
          validateSuccessPopup('update');
          validateRenderedCondition(IS_EXPECTED_CONDITION);
        });

        it('Deletes a blocklist item', () => {
          openBlocklist();
          deleteBlocklistItem();
          validateSuccessPopup('delete');
        });
      });

      describe('Updates and deletes blocklist match item', () => {
        let itemId: string;

        beforeEach(() => {
          createArtifactList(ENDPOINT_ARTIFACT_LISTS.blocklists.id);
          createPerPolicyArtifact('Test Blocklist', createArtifactBodyRequest('match')).then(
            (response) => {
              itemId = response.body.item_id;
            }
          );
        });

        it('Updates a match blocklist item', () => {
          openBlocklist({ itemId });
          selectOperator('is one of');
          submitBlocklist();
          validateSuccessPopup('update');
          validateRenderedCondition(IS_ONE_OF_EXPECTED_CONDITION);
        });

        it('Deletes a blocklist item', () => {
          openBlocklist();
          deleteBlocklistItem();
          validateSuccessPopup('delete');
        });
      });
    });
  }
);
