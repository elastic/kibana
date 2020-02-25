/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { useLinkProps } from '../../hooks/use_link_props';

interface ViewSourceConfigurationButtonProps {
  'data-test-subj'?: string;
  children: React.ReactNode;
}

export const ViewSourceConfigurationButton = ({
  'data-test-subj': dataTestSubj,
  children,
}: ViewSourceConfigurationButtonProps) => {
  const linkProps = useLinkProps({ pathname: '/settings' });
  return (
    <EuiButton data-test-subj={dataTestSubj} color="primary" {...linkProps}>
      {children}
    </EuiButton>
  );
};
