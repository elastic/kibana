/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  useInspectorContext,
  enableInspectEsQueries,
} from '../../../../../../observability/public';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';

export function UxInspectorHeaderLink() {
  const { inspectorAdapters } = useInspectorContext();
  const { uiSettings, inspector } = useKibanaServices();

  const isInspectorEnabled = uiSettings.get<boolean>(enableInspectEsQueries);

  const inspect = () => {
    inspector.open(inspectorAdapters);
  };

  if (!isInspectorEnabled) {
    return null;
  }

  return (
    <EuiHeaderLink color="primary" onClick={inspect}>
      {i18n.translate('xpack.ux.inspectButtonText', {
        defaultMessage: 'Inspect',
      })}
    </EuiHeaderLink>
  );
}
