/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { isEndpointPreconfigured } from '../../../../utils/preconfigured_endpoint_helper';
import * as i18n from './translations';
import { isProviderTechPreview } from '../../../../utils/reranker_helper';

export interface EndpointInfoProps {
  inferenceId: string;
  provider: InferenceAPIConfigResponse;
}

export const EndpointInfo: React.FC<EndpointInfoProps> = ({ inferenceId, provider }) => (
  <EuiFlexGroup justifyContent="spaceBetween">
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <span>
            <strong>{inferenceId}</strong>
          </span>
        </EuiFlexItem>
        {isProviderTechPreview(provider) ? (
          <EuiFlexItem grow={false}>
            <span>
              <EuiBetaBadge
                label={i18n.TECH_PREVIEW_LABEL}
                size="s"
                color="subdued"
                alignment="middle"
              />
            </span>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
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
