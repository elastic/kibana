/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonTo } from '../react_router_helpers';

import { ADD_ROLE_MAPPING_BUTTON } from './constants';

interface Props {
  path: string;
}

export const AddRoleMappingButton: React.FC<Props> = ({ path }) => (
  <EuiButtonTo to={path} fill>
    {ADD_ROLE_MAPPING_BUTTON}
  </EuiButtonTo>
);
