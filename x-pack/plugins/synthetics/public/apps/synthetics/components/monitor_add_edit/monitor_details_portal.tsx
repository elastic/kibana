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
import { useSelectedLocation } from '../monitor_details/hooks/use_selected_location';
import { MonitorDetailsLinkPortalNode } from './portals';

interface Props {
  name: string;
  configId: string;
  locationId?: string;
}

export const MonitorDetailsLinkPortal = ({ name, configId, locationId }: Props) => {
  return (
    <InPortal node={MonitorDetailsLinkPortalNode}>
      <MonitorDetailsLink name={name} configId={configId} locationId={locationId} />
    </InPortal>
  );
};

export const MonitorDetailsLink = ({ name, configId, locationId }: Props) => {
  const selectedLocation = useSelectedLocation();

  let locId = locationId;

  if (selectedLocation?.id && !locationId) {
    locId = selectedLocation.id;
  }

  const history = useHistory();
  const href = history.createHref({
    pathname: locId ? `monitor/${configId}?locationId=${locId}` : `monitor/${configId}`,
  });
  return (
    <EuiLink href={href}>
      <EuiIcon type="arrowLeft" /> {name}
    </EuiLink>
  );
};
