/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
} from '@elastic/eui';

export function SloConfiguration() {
  return (
    <EuiModal onClose={() => {}}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>SLO configuration</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>SLO Modal Body!</EuiModalBody>
      <EuiModalFooter>SLO Modal Footer</EuiModalFooter>
    </EuiModal>
  );
}
