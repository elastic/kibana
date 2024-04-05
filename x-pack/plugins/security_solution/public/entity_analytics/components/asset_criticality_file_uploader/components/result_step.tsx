/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import React from 'react';
import type { AssetCriticalityCsvUploadResponse } from '../../../../../common/entity_analytics/asset_criticality/types';

export const AssetCriticalityResultStep: React.FC<{
  result: AssetCriticalityCsvUploadResponse;
}> = ({ result }) => {
  if (result.stats.total > 0) {
    return (
      <EuiCallOut title="Great success" color="success" iconType="checkInCircleFilled">
        <p>{'Asset criticalities has been successfully mapped.'}</p>
        {result.stats.created ? <p>{`Created: ${result.stats.created} `}</p> : ''}
        {result.stats.updated ? <p>{`Updated: ${result.stats.updated}`}</p> : ''}
        {result.stats.errors ? <p>{`Error: ${result.stats.errors}`}</p> : ''}
        <p>{`Total: ${result.stats.total}`}</p>
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiCallOut title="Error" color="danger" iconType="alert">
        <p>{'There was an error while mapping asset criticalities.'}</p>
        <p>{`Errors: ${result.errors.join(', ')}`}</p>
      </EuiCallOut>
    </>
  );
};
