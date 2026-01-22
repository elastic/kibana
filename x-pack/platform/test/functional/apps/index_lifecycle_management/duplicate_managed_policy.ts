/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

const managedPolicyName = 'ilm-managed-policy-dup-test';
const clonedPolicyName = 'ilm-managed-policy-dup-test-clone';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexLifecycleManagement']);
  const esClient = getService('es');
  const retry = getService('retry');
  const security = getService('security');
  const testSubjects = getService('testSubjects');

  describe('Duplicate managed policy', function () {
    before(async () => {
      await security.testUser.setRoles(['manage_ilm']);

      // Clean up from any previous run.
      try {
        await esClient.ilm.deleteLifecycle({ name: clonedPolicyName });
      } catch (e) {
        // ignore
      }
      try {
        await esClient.ilm.deleteLifecycle({ name: managedPolicyName });
      } catch (e) {
        // ignore
      }

      await esClient.ilm.putLifecycle({
        name: managedPolicyName,
        policy: {
          _meta: { managed: true },
          phases: {
            hot: {
              actions: {},
            },
          },
        },
      });
    });

    after(async () => {
      try {
        await esClient.ilm.deleteLifecycle({ name: clonedPolicyName });
      } catch (e) {
        // ignore
      }
      try {
        await esClient.ilm.deleteLifecycle({ name: managedPolicyName });
      } catch (e) {
        // ignore
      }
      await security.testUser.restoreDefaults();
    });

    it('does not mark duplicated managed policies as managed', async () => {
      await pageObjects.common.navigateToApp('indexLifecycleManagement', {
        path: `policies/edit/${managedPolicyName}`,
      });

      // Sanity check: original policy is managed.
      await retry.waitFor('managed policy callout to render', async () => {
        return await testSubjects.exists('editManagedPolicyCallOut');
      });

      // Clone policy via "Save as new policy" switch and save.
      await testSubjects.click('saveAsNewSwitch');
      await testSubjects.setValue('policyNameField', clonedPolicyName, { clearWithKeyboard: true });
      await testSubjects.click('savePolicyButton');

      // After saving, we are redirected back to the policy list with the flyout open for the new policy.
      await retry.waitFor('cloned policy flyout to open', async () => {
        return (await pageObjects.indexLifecycleManagement.flyoutHeaderText()) === clonedPolicyName;
      });

      // Verify the cloned policy is NOT treated as managed in the editor.
      await pageObjects.common.navigateToApp('indexLifecycleManagement', {
        path: `policies/edit/${clonedPolicyName}`,
      });
      await retry.waitFor('edit warning to render', async () => {
        return await testSubjects.exists('editWarning');
      });
      expect(await testSubjects.exists('editManagedPolicyCallOut')).to.be(false);

      // Verify the cloned policy is NOT managed at the source (ES ILM policy _meta).
      const getLifecycleResponse = await esClient.ilm.getLifecycle({ name: clonedPolicyName });
      const responseBody = (getLifecycleResponse as any).body ?? getLifecycleResponse;
      const cloned = responseBody?.[clonedPolicyName]?.policy;
      expect(cloned?._meta?.managed).to.be(undefined);
    });
  });
};
