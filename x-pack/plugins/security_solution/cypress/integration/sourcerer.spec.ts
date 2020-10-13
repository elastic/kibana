/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loginAndWaitForPage } from '../tasks/login';

import { HOSTS_URL } from '../urls/navigation';
import { waitForAllHostsToBeLoaded } from '../tasks/hosts/all_hosts';
import {
  openSourcerer,
  isSourcererSelection,
  isSourcererOptions,
  setSourcererOption,
  resetSourcerer,
  isHostsStatValue,
  unsetSourcererOption,
  isNotSourcererSelection,
  openTimelineSourcerer,
} from '../tasks/sourcerer';
import { openTimelineUsingToggle } from '../tasks/security_main';
import { executeTimelineKQL } from '../tasks/timeline';

describe('Sourcerer', () => {
  beforeEach(() => {
    loginAndWaitForPage(HOSTS_URL);
  });
  describe('Default scope', () => {
    it('has SIEM index patterns selected on initial load', () => {
      openSourcerer();
      isSourcererSelection(`auditbeat-*`);
    });

    it('has Kibana index patterns in the options', () => {
      openSourcerer();
      isSourcererOptions([`metrics-*`, `logs-*`]);
    });
    it('selected KIP gets added to sourcerer', () => {
      setSourcererOption(`metrics-*`);
      openSourcerer();
      isSourcererSelection(`metrics-*`);
    });

    it('does not return data without correct pattern selected', () => {
      isHostsStatValue('4 ');
      setSourcererOption(`metrics-*`);
      unsetSourcererOption(`auditbeat-*`);
      isHostsStatValue('0 ');
    });

    it('reset button restores to original state', () => {
      setSourcererOption(`metrics-*`);
      openSourcerer();
      isSourcererSelection(`metrics-*`);
      resetSourcerer();
      openSourcerer();
      isNotSourcererSelection(`metrics-*`);
    });
  });
  describe.only('Timeline scope', () => {
    it('has SIEM index patterns selected on initial load', () => {
      openTimelineUsingToggle();
      executeTimelineKQL('host.name: *');
      openTimelineSourcerer();
      cy.wait(100000);
      // openSourcerer();
      // isSourcererSelection(`auditbeat-*`);
    });
  });
});
