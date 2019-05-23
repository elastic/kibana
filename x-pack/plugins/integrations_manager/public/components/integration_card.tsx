/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButtonEmpty, EuiCard } from '@elastic/eui';
import { generatePath, Link } from 'react-router-dom';
import { APP } from '../../common/constants';
import { IntegrationInfo } from '../../common/types';

export function IntegrationCard({ description, name, version, icon }: IntegrationInfo) {
  return (
    <EuiCard
      title={name}
      description={description}
      footer={
        <EuiButtonEmpty>
          <Link to={generatePath(APP.DETAIL_VIEW, { pkgkey: `${name}-${version}` })}>
            More Details
          </Link>
        </EuiButtonEmpty>
      }
    />
  );
}
