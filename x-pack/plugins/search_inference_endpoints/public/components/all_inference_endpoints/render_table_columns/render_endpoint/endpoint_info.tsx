/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { isEndpointPreconfigured } from '../../../../utils/preconfigured_endpoint_helper';
import * as i18n from './translations';

export interface EndpointInfoProps {
  inferenceId: string;
}

export const EndpointInfo: React.FC<EndpointInfoProps> = ({ inferenceId }) => (
  <EuiFlexGroup justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>
      <span>
        <strong>{inferenceId}</strong>
      </span>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <span>
        {isEndpointPreconfigured(inferenceId) ? (
          <EuiBetaBadge label={i18n.PRECONFIGURED_LABEL} size="s" color="hollow" />
        ) : null}
      </span>
    </EuiFlexItem>
  </EuiFlexGroup>
);
