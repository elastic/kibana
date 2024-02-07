/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { notificationServiceMock } from '@kbn/core/public/mocks';

import { setupEnvironment } from '../helpers';
import { createTestEnrichPolicy } from '../helpers/fixtures';
import { EnrichPoliciesTestBed, setup } from './enrich_policies.helpers';
import { notificationService } from '../../../public/application/services/notification';

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: any) => {
          props.onChange(e.jsonContent);
        }}
      />
    ),
  };
});

describe('Enrich policies tab', () => {
  const { httpSetup, httpRequestsMockHelpers, setDelayResponse } = setupEnvironment();
  let testBed: EnrichPoliciesTestBed;

  describe('empty states', () => {
    beforeEach(async () => {
      setDelayResponse(false);

      httpRequestsMockHelpers.setGetPrivilegesResponse({
        hasAllPrivileges: true,
        missingPrivileges: { cluster: [] },
      });
    });

    test('displays a loading prompt', async () => {
      setDelayResponse(true);

      testBed = await setup(httpSetup);

      await act(async () => {
        testBed.actions.goToEnrichPoliciesTab();
      });

      const { exists, component } = testBed;
      component.update();

      expect(exists('sectionLoading')).toBe(true);
    });

    test('displays a error prompt', async () => {
      const error = {
        statusCode: 400,
        error: 'Bad Request',
        message: 'something went wrong...',
      };

      httpRequestsMockHelpers.setLoadEnrichPoliciesResponse(undefined, error);

      testBed = await setup(httpSetup);

      await act(async () => {
        testBed.actions.goToEnrichPoliciesTab();
      });

      const { exists, component } = testBed;
      component.update();

      expect(exists('sectionError')).toBe(true);
    });
  });

  describe('permissions check', () => {
    it('shows a permissions error when the user does not have sufficient privileges', async () => {
      httpRequestsMockHelpers.setGetPrivilegesResponse({
        hasAllPrivileges: false,
        missingPrivileges: { cluster: ['manage_enrich'] },
      });

      testBed = await setup(httpSetup);
      await act(async () => {
        testBed.actions.goToEnrichPoliciesTab();
      });

      testBed.component.update();

      expect(testBed.exists('enrichPoliciesInsuficientPrivileges')).toBe(true);
    });
  });

  describe('policies list', () => {
    let testPolicy: ReturnType<typeof createTestEnrichPolicy>;
    beforeEach(async () => {
      testPolicy = createTestEnrichPolicy('policy-match', 'match');

      httpRequestsMockHelpers.setLoadEnrichPoliciesResponse([
        testPolicy,
        createTestEnrichPolicy('policy-range', 'range'),
      ]);

      httpRequestsMockHelpers.setGetPrivilegesResponse({
        hasAllPrivileges: true,
        missingPrivileges: { cluster: [] },
      });

      testBed = await setup(httpSetup);
      await act(async () => {
        testBed.actions.goToEnrichPoliciesTab();
      });

      testBed.component.update();
    });

    it('shows enrich policies in table', async () => {
      const { table } = testBed;
      expect(table.getMetaData('enrichPoliciesTable').rows.length).toBe(2);
    });

    it('can reload the table data through a call to action', async () => {
      const { actions } = testBed;

      // Reset mock to clear calls from setup
      httpSetup.get.mockClear();

      await act(async () => {
        actions.clickReloadPoliciesButton();
      });

      // Should have made a call to load the policies after the reload
      // button is clicked.
      expect(httpSetup.get.mock.calls.length).toBeGreaterThan(0);
    });

    describe('details flyout', () => {
      it('can open the details flyout', async () => {
        const { actions, exists } = testBed;

        await actions.clickEnrichPolicyAt(0);

        expect(exists('policyDetailsFlyout')).toBe(true);
      });

      it('contains all the necessary policy fields', async () => {
        const { actions, find } = testBed;

        await actions.clickEnrichPolicyAt(0);

        expect(find('policyTypeValue').text()).toBe(testPolicy.type);
        expect(find('policyIndicesValue').text()).toBe(testPolicy.sourceIndices.join(', '));
        expect(find('policyMatchFieldValue').text()).toBe(testPolicy.matchField);
        expect(find('policyEnrichFieldsValue').text()).toBe(testPolicy.enrichFields.join(', '));

        const codeEditorValue = find('queryEditor')
          .at(0)
          .getDOMNode()
          .getAttribute('data-currentvalue');
        expect(JSON.parse(codeEditorValue || '')).toEqual(testPolicy.query);
      });
    });

    describe('policy actions', () => {
      const notificationsServiceMock = notificationServiceMock.createStartContract();

      beforeEach(async () => {
        notificationService.setup(notificationsServiceMock);

        httpRequestsMockHelpers.setLoadEnrichPoliciesResponse([
          createTestEnrichPolicy('policy-match', 'match'),
        ]);

        testBed = await setup(httpSetup, {
          services: {
            notificationService,
          },
        });

        await act(async () => {
          testBed.actions.goToEnrichPoliciesTab();
        });

        testBed.component.update();
      });

      describe('deletion', () => {
        it('can delete a policy', async () => {
          const { actions, exists } = testBed;

          httpRequestsMockHelpers.setDeleteEnrichPolicyResponse('policy-match', {
            acknowledged: true,
          });

          await actions.clickDeletePolicyAt(0);

          expect(exists('deletePolicyModal')).toBe(true);

          await actions.clickConfirmDeletePolicyButton();

          expect(notificationsServiceMock.toasts.add).toHaveBeenLastCalledWith(
            expect.objectContaining({
              title: 'Deleted policy-match',
            })
          );
          expect(httpSetup.delete.mock.calls.length).toBe(1);
        });

        test('displays an error toast if it fails', async () => {
          const { actions, exists } = testBed;

          const error = {
            statusCode: 400,
            error: 'Bad Request',
            message: 'something went wrong...',
          };

          httpRequestsMockHelpers.setDeleteEnrichPolicyResponse('policy-match', undefined, error);

          await actions.clickDeletePolicyAt(0);

          expect(exists('deletePolicyModal')).toBe(true);

          await actions.clickConfirmDeletePolicyButton();

          expect(notificationsServiceMock.toasts.add).toHaveBeenLastCalledWith(
            expect.objectContaining({
              title: `Error deleting enrich policy: 'something went wrong...'`,
            })
          );
        });
      });

      describe('execution', () => {
        it('can execute a policy', async () => {
          const { actions, exists } = testBed;

          httpRequestsMockHelpers.setExecuteEnrichPolicyResponse('policy-match', {
            acknowledged: true,
          });

          await actions.clickExecutePolicyAt(0);

          expect(exists('executePolicyModal')).toBe(true);

          await actions.clickConfirmExecutePolicyButton();

          expect(notificationsServiceMock.toasts.add).toHaveBeenLastCalledWith(
            expect.objectContaining({
              title: 'Executed policy-match',
            })
          );
          expect(httpSetup.put.mock.calls.length).toBe(1);
        });

        test('displays an error toast if it fails', async () => {
          const { actions, exists } = testBed;

          const error = {
            statusCode: 400,
            error: 'Bad Request',
            message: 'something went wrong...',
          };

          httpRequestsMockHelpers.setExecuteEnrichPolicyResponse('policy-match', undefined, error);

          await actions.clickExecutePolicyAt(0);

          expect(exists('executePolicyModal')).toBe(true);

          await actions.clickConfirmExecutePolicyButton();

          expect(notificationsServiceMock.toasts.add).toHaveBeenLastCalledWith(
            expect.objectContaining({
              title: `Error executing enrich policy: 'something went wrong...'`,
            })
          );
        });
      });
    });
  });
});
