/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButtonEmpty, EuiCard } from '@elastic/eui';
import { Link } from 'react-router-dom';
import { linkToDetailView } from '../routes';
import { IntegrationListItem } from '../../common/types';

export function IntegrationCard({ description, name, version }: IntegrationListItem) {
  return (
    <EuiCard
      title={name}
      description={description}
      footer={
        <EuiButtonEmpty>
          <Link to={linkToDetailView({ name, version })}>More Details</Link>
        </EuiButtonEmpty>
      }
    />
  );
}
