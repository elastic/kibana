/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';

export function RequestsViewCallout() {
  return (
    <EuiCallOut
      size="s"
      title={i18n.translate('xpack.maps.inspector.vectorTile.requestsView', {
        defaultMessage: `You're viewing requests from the vector tile search API. To view requests from the search API, set the 'View' to 'Requests'.`,
      })}
      iconType="iInCircle"
    />
  );
}
