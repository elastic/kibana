/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FlyoutTabIds } from '../../../hooks/use_flyout_tab_id';

export const processesTab = {
  id: FlyoutTabIds.PROCESSES,
  name: i18n.translate('xpack.infra.metrics.nodeDetails.tabs.processes', {
    defaultMessage: 'Processes',
  }),
  'data-test-subj': 'hostsView-flyout-tabs-processes',
};
