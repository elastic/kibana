/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { enableInspectEsQueries, useInspectorContext } from '@kbn/observability-plugin/public';
import { ClientPluginsStart } from '../../../../../plugin';
import { useSyntheticsSettingsContext } from '../../../contexts';

export function InspectorHeaderLink() {
  const {
    services: { inspector, uiSettings },
  } = useKibana<ClientPluginsStart>();

  const { isDev } = useSyntheticsSettingsContext();

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
      {i18n.translate('xpack.synthetics.inspectButtonText', {
        defaultMessage: 'Inspect',
      })}
    </EuiHeaderLink>
  );
}
