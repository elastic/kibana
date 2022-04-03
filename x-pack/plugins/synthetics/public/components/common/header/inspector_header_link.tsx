/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { enableInspectEsQueries, useInspectorContext } from '../../../../../observability/public';
import { ClientPluginsStart } from '../../../apps/plugin';
import { useUptimeSettingsContext } from '../../../contexts/uptime_settings_context';

export function InspectorHeaderLink() {
  const {
    services: { inspector, uiSettings },
  } = useKibana<ClientPluginsStart>();

  const { isDev } = useUptimeSettingsContext();

  const { inspectorAdapters } = useInspectorContext();

  const isInspectorEnabled = uiSettings?.get<boolean>(enableInspectEsQueries);

  const inspect = () => {
    inspector.open(inspectorAdapters);
  };

  if (!isInspectorEnabled && !isDev) {
    return null;
  }

  return (
    <EuiHeaderLink color="primary" onClick={inspect}>
      {i18n.translate('xpack.uptime.inspectButtonText', {
        defaultMessage: 'Inspect',
      })}
    </EuiHeaderLink>
  );
}
