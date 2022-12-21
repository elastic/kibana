/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { EuiLink, EuiIcon } from '@elastic/eui';
import { InPortal } from 'react-reverse-portal';
import { MonitorDetailsLinkPortalNode } from './portals';

export const MonitorDetailsLinkPortal = ({
  name,
  configId,
}: {
  name: string;
  configId: string;
}) => {
  return (
    <InPortal node={MonitorDetailsLinkPortalNode}>
      <MonitorDetailsLink name={name} configId={configId} />
    </InPortal>
  );
};

export const MonitorDetailsLink = ({ name, configId }: { name: string; configId: string }) => {
  const history = useHistory();
  const href = history.createHref({
    pathname: `monitor/${configId}`,
  });
  return (
    <EuiLink href={href}>
      <EuiIcon type="arrowLeft" /> {name}
    </EuiLink>
  );
};
