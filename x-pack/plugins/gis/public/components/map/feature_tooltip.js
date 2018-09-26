/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import React from 'react';

export function FeatureTooltip({ feature, propertyNames }) {

  return propertyNames.map(propertyName => {
    return (
      <div key={propertyName}>
        <strong>{propertyName}</strong>
        {' '}
        {_.get(feature, ['properties', propertyName], '-')}
      </div>
    );
  });
}

