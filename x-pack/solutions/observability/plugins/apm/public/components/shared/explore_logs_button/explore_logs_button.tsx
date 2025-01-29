/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you ∏may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type LogsLocatorParams, LOGS_LOCATOR_ID } from '@kbn/logs-shared-plugin/common';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { buildLogsExplorerLocatorConfig } from './logs_explorer_locator_config';

export function ExploreLogsButton({
  start,
  end,
  kuery,
}: {
  start: string;
  end: string;
  kuery?: string;
}) {
  const { share } = useApmPluginContext();

  const logsLocator = share.url.locators.get<LogsLocatorParams>(LOGS_LOCATOR_ID);

  if (!logsLocator) {
    return null;
  }

  const { logsExplorerLinkProps } = buildLogsExplorerLocatorConfig({
    locator: logsLocator,
    from: start,
    to: end,
    kuery,
  });

  return (
    <EuiButtonEmpty
      data-test-subj="apmExploreLogsButton"
      href={logsExplorerLinkProps.href}
      color="primary"
    >
      {i18n.translate('xpack.apm.button.exploreLogs', {
        defaultMessage: 'Explore logs',
      })}
    </EuiButtonEmpty>
  );
}
