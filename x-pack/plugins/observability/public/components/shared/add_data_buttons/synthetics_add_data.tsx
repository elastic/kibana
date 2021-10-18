/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHeaderLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibana } from '../../../utils/kibana_react';

export function SyntheticsAddData() {
  const kibana = useKibana();

  return (
    <EuiHeaderLink
      aria-label={i18n.translate('xpack.observability.page_header.addUptimeDataLink.label', {
        defaultMessage: 'Navigate to the Elastic Synthetics integration to add Uptime data',
      })}
      href={kibana.services?.application?.getUrlForApp('/integrations/detail/synthetics/overview')}
      color="primary"
      iconType="indexOpen"
    >
      {ADD_DATA_LABEL}
    </EuiHeaderLink>
  );
}

const ADD_DATA_LABEL = i18n.translate('xpack.observability..synthetics.addDataButtonLabel', {
  defaultMessage: 'Add synthetics data',
});
