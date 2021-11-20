/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip, EuiText } from '@elastic/eui';
import React from 'react';

import type { SecuredFeature } from '../../../../model';

interface Props {
  feature: SecuredFeature;
}

export const FeatureTableCell = ({ feature }: Props) => {
  let tooltipElement = null;
  if (feature.getPrivilegesTooltip()) {
    const tooltipContent = (
      <EuiText>
        <p>{feature.getPrivilegesTooltip()}</p>
      </EuiText>
    );
    tooltipElement = (
      <EuiIconTip
        iconProps={{
          className: 'eui-alignTop',
        }}
        type={'iInCircle'}
        color={'subdued'}
        content={tooltipContent}
      />
    );
  }

  return (
    <span data-test-subj={`featureTableCell`}>
      {feature.name} {tooltipElement}
    </span>
  );
};
