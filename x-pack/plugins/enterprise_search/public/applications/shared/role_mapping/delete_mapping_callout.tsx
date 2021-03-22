/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiCallOut } from '@elastic/eui';

import {
  DELETE_ROLE_MAPPING_TITLE,
  DELETE_ROLE_MAPPING_DESCRIPTION,
  DELETE_ROLE_MAPPING_BUTTON,
} from './constants';

interface Props {
  handleDeleteMapping(): void;
}

export const DeleteMappingCallout: React.FC<Props> = ({ handleDeleteMapping }) => (
  <EuiCallOut color="danger" iconType="alert" title={DELETE_ROLE_MAPPING_TITLE}>
    <p>{DELETE_ROLE_MAPPING_DESCRIPTION}</p>
    <EuiButton color="danger" fill onClick={handleDeleteMapping}>
      {DELETE_ROLE_MAPPING_BUTTON}
    </EuiButton>
  </EuiCallOut>
);
