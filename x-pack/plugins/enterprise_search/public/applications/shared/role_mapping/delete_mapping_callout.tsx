/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiCallOut } from '@elastic/eui';

interface IDeleteMappingCalloutProps {
  handleDeleteMapping(): void;
}

export const DeleteMappingCallout: React.FC<IDeleteMappingCalloutProps> = ({
  handleDeleteMapping,
}) => (
  <EuiCallOut color="danger" iconType="alert" title="Remove this role mapping">
    <p>Please note that deleting a mapping is permanent and cannot be undone</p>
    <EuiButton color="danger" fill onClick={handleDeleteMapping}>
      Delete Mapping
    </EuiButton>
  </EuiCallOut>
);
