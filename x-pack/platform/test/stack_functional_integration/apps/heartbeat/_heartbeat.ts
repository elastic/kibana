/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'timePicker']);
  const testSubjects = getService('testSubjects');

  describe('check heartbeat overview page', function () {
    it('Uptime app should show 1 UP monitor', async function () {
      await PageObjects.common.navigateToApp('uptime', { insertTimestamp: false });
      // dismiss the Management tour if it's present
      if (await testSubjects.exists('syntheticsManagementTourDismiss')) {
        await testSubjects.click('syntheticsManagementTourDismiss');
      }
      await PageObjects.timePicker.setCommonlyUsedTime('Last_1 year');
      await retry.try(async function () {
        const upCount = parseInt(
          await testSubjects.getVisibleText('xpack.synthetics.snapshot.donutChart.up'),
          10
        );
        expect(upCount).to.eql(1);
      });
    });
    it('Uptime app should show Kibana QA Monitor present', async function () {
      const monitorIdsToCheck = ['kibana-qa-monitor'];
      await retry.tryForTime(15000, async () => {
        await Promise.all(
          monitorIdsToCheck.map((monitorId) =>
            testSubjects.existOrFail(`monitor-page-link-${monitorId}`)
          )
        );
      });
    });
  });
}
