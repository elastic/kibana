/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { HostMetadata } from '../../../../../../../common/endpoint/types';
import { BackToEndpointDetailsFlyoutSubHeader } from './back_to_endpoint_details_flyout_subheader';
import { FlyoutBodyNoTopPadding } from './flyout_body_no_top_padding';

export const EndpointUnIsolateFlyoutPanel = memo<{ hostMeta: HostMetadata }>(({ hostMeta }) => {
  return (
    <>
      <BackToEndpointDetailsFlyoutSubHeader endpointId={hostMeta.agent.id} />

      <FlyoutBodyNoTopPadding>{'WIP'}</FlyoutBodyNoTopPadding>
    </>
  );
});
EndpointUnIsolateFlyoutPanel.displayName = 'EndpointUnIsolateFlyoutPanel';
