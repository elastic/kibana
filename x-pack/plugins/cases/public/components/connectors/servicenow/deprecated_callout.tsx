/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';

import * as i18n from './translations';

const DeprecatedCalloutComponent: React.FC = () => {
  return (
    <EuiCallOut
      title={i18n.LEGACY_CONNECTOR_WARNING_TITLE}
      color="danger"
      iconType="alert"
      data-test-subj="legacy-connector-warning-callout"
    >
      {i18n.LEGACY_CONNECTOR_WARNING_DESC}
    </EuiCallOut>
  );
};

export const DeprecatedCallout = React.memo(DeprecatedCalloutComponent);
