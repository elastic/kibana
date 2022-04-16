/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { useLinkProps } from '@kbn/observability-plugin/public';

interface ViewSourceConfigurationButtonProps {
  'data-test-subj'?: string;
  children: React.ReactNode;
  app: 'logs' | 'metrics';
}

export const ViewSourceConfigurationButton = ({
  'data-test-subj': dataTestSubj,
  app,
  children,
}: ViewSourceConfigurationButtonProps) => {
  const linkProps = useLinkProps({ app, pathname: '/settings' });
  return (
    <EuiButton data-test-subj={dataTestSubj} color="primary" {...linkProps}>
      {children}
    </EuiButton>
  );
};
