/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanelProps,
} from '@elastic/eui';
import React, { ReactNode } from 'react';

interface StepModalProps {
  title?: string;
  panelProps?: EuiPanelProps;
  panelFooter?: ReactNode;
  children?: ReactNode;
}

export function StepModal(props: StepModalProps) {
  const { title, children, panelFooter } = props;
  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>{children}</EuiModalBody>
      <EuiModalFooter>{panelFooter}</EuiModalFooter>
    </>
  );
}
