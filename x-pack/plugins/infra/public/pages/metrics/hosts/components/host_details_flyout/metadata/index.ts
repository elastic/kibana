/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FlyoutTabIds } from '../../../hooks/use_host_flyout_open_url_state';

export const metadataTab = {
  id: FlyoutTabIds.METADATA,
  name: i18n.translate('xpack.infra.nodeDetails.tabs.metadata.title', {
    defaultMessage: 'Metadata',
  }),
  'data-test-subj': 'hostsView-flyout-tabs-metadata',
};
