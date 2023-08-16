/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { notificationServiceMock } from '@kbn/core/public/mocks';

import { setupEnvironment } from '../helpers';
import { createTestEnrichPolicy } from '../helpers/fixtures';
import { EnrichPoliciesTestBed, setup } from './enrich_policies.helpers';
import { notificationService } from '../../../public/application/services/notification';

describe('Enrich policies tab', () => {
  const { httpSetup, httpRequestsMockHelpers, setDelayResponse } = setupEnvironment();
  let testBed: EnrichPoliciesTestBed;

  describe('empty states', () => {
    beforeEach(async () => {
      setDelayResponse(false);
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

  describe('policies list', () => {
    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadEnrichPoliciesResponse([
        createTestEnrichPolicy('policy-match', 'match'),
        createTestEnrichPolicy('policy-range', 'range'),
      ]);

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
      expect(httpSetup.get.mock.calls).toHaveLength(1);
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
