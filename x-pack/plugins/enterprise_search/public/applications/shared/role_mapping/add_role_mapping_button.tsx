/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Link } from 'react-router-dom';

import { EuiButton } from '@elastic/eui';

interface IAddRoleMappingButtonProps {
  path: string;
}

export const AddRoleMappingButton: React.FC<IAddRoleMappingButtonProps> = ({ path }) => (
  <Link to={path}>
    <EuiButton fill color="secondary" onClick={() => null}>
      Add mapping
    </EuiButton>
  </Link>
);
