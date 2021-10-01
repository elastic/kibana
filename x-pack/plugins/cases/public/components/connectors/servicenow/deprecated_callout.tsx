/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';

import * as i18n from './translations';

interface Props {
  isEdit: boolean;
}

const DeprecatedCalloutComponent: React.FC<Props> = ({ isEdit }) => {
  const color = isEdit ? 'danger' : 'warning';
  return (
    <EuiCallOut
      title={i18n.LEGACY_CONNECTOR_WARNING_TITLE}
      color={color}
      iconType="alert"
      data-test-subj="legacy-connector-warning-callout"
    >
      {i18n.LEGACY_CONNECTOR_WARNING_DESC}
    </EuiCallOut>
  );
};

export const DeprecatedCallout = React.memo(DeprecatedCalloutComponent);
