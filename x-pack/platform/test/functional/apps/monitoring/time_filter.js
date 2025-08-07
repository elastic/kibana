/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getLifecycleMethods } from './_get_lifecycle_methods';

export default function ({ getService, getPageObjects }) {
  const PageObjects = getPageObjects(['header', 'timePicker']);
  const testSubjects = getService('testSubjects');
  const clusterList = getService('monitoringClusterList');
  const browser = getService('browser');

  const assertTimePickerRange = async (start, end) => {
    const timeConfig = await PageObjects.timePicker.getTimeConfig();
    expect(timeConfig.start).to.eql(start);
    expect(timeConfig.end).to.eql(end);
  };

  describe('Timefilter', () => {
    const { setup, tearDown } = getLifecycleMethods(getService, getPageObjects);

    const from = 'Aug 15, 2017 @ 21:00:00.000';
    const to = 'Aug 16, 2017 @ 00:00:00.000';

    before(async () => {
      await setup('x-pack/test/functional/es_archives/monitoring/multicluster', {
        from,
        to,
      });
      await clusterList.assertDefaults();
      await clusterList.closeAlertsModal();
    });

    after(async () => {
      await tearDown();
    });

    it('syncs timepicker with url hash updates', async () => {
      await assertTimePickerRange(from, to);

      await browser.execute(() => {
        const hash = window.location.hash;
        window.location.hash = hash.replace(/time:\(([^)]+)\)/, 'time:(from:now-15m,to:now)');
      });

      await assertTimePickerRange('~ 15 minutes ago', 'now');
    });

    // FLAKY: https://github.com/elastic/kibana/issues/48910
    it.skip('should send another request when clicking Refresh', async () => {
      await testSubjects.click('querySubmitButton');
      const isLoading = await PageObjects.header.isGlobalLoadingIndicatorVisible();
      expect(isLoading).to.be(true);
    });

    // TODO: [cr] I'm not sure this test is any better than the above one, we might need to rely solely on unit tests
    // for this functionality
    it.skip('should send another request when changing the time picker', async () => {
      await PageObjects.timePicker.setAbsoluteRange(
        'Aug 15, 2016 @ 21:00:00.000',
        'Aug 16, 2016 @ 00:00:00.000'
      );
      await clusterList.assertNoData();
    });
  });
}
