/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ContentsProps } from '.';
import { useApmRouter } from '../../../../hooks/use_apm_router';

export function BackendContents({ nodeData }: ContentsProps) {
  const backendName = nodeData.label;
  // For  const { query } = useApmParams('/service-map');
  const apmRouter = useApmRouter();

  const detailsUrl = apmRouter.link('/backends/:backendName/overview', {
    path: { backendName },
  });

  return (
    <>
      <EuiFlexItem>
        <EuiButton href={detailsUrl} fill={true}>
          {i18n.translate('xpack.apm.serviceMap.backendDetailsButtonText', {
            defaultMessage: 'Backend Details',
          })}
        </EuiButton>
      </EuiFlexItem>
    </>
  );
}
