/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiLink } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';

interface DetailPageLinkProps {
  configId: string;
}

export const MonitorPageLink: FC<DetailPageLinkProps> = ({ children, configId }) => {
  const basePath = useKibana().services.http?.basePath.get();
  return (
    <EuiLink
      data-test-subj="syntheticsMonitorPageLinkLink"
      href={`${basePath}/app/synthetics/monitor/${configId}`}
    >
      {children}
    </EuiLink>
  );
};
