/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { enableInspectEsQueries } from '../../../../../../observability/common/ui_settings_keys';
import { useInspectorContext } from '../../../../../../observability/public';

export function UxInspectorHeaderLink() {
  const { inspector } = useApmPluginContext();
  const { inspectorAdapters } = useInspectorContext();
  const {
    services: { uiSettings },
  } = useKibana();

  const isInspectorEnabled = uiSettings?.get<boolean>(enableInspectEsQueries);

  const inspect = () => {
    inspector.open(inspectorAdapters);
  };

  if (!isInspectorEnabled) {
    return null;
  }

  return (
    <EuiHeaderLink color="primary" onClick={inspect}>
      {i18n.translate('xpack.apm.inspectButtonText', {
        defaultMessage: 'Inspect',
      })}
    </EuiHeaderLink>
  );
}
