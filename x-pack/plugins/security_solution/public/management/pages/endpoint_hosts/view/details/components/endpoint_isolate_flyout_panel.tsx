/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { HostMetadata } from '../../../../../../../common/endpoint/types';
import { BackToEndpointDetailsFlyoutSubHeader } from './back_to_endpoint_details_flyout_subheader';
import { EndpointIsolateForm } from '../../../../../../common/components/endpoint/host_isolation';
import { FlyoutBodyNoTopPadding } from './flyout_body_no_top_padding';
import { getEndpointDetailsPath } from '../../../../../common/routing';
import { useEndpointSelector } from '../../hooks';
import { uiQueryParams } from '../../../store/selectors';

export const EndpointIsolateFlyoutPanel = memo<{
  hostMeta: HostMetadata;
}>(({ hostMeta }) => {
  const history = useHistory();
  const { show, ...queryParams } = useEndpointSelector(uiQueryParams);

  const handleCancel = useCallback(() => {
    history.push(
      getEndpointDetailsPath({
        name: 'endpointDetails',
        ...queryParams,
        selected_endpoint: hostMeta.agent.id,
      })
    );
  }, [history, hostMeta.agent.id, queryParams]);

  const handleConfirm = useCallback(() => {}, []);

  const handleChange = useCallback(() => {}, []);

  return (
    <>
      <BackToEndpointDetailsFlyoutSubHeader endpointId={hostMeta.agent.id} />

      <FlyoutBodyNoTopPadding>
        <EndpointIsolateForm
          hostName={hostMeta.host.name}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
          onChange={handleChange}
        />
      </FlyoutBodyNoTopPadding>
    </>
  );
});
EndpointIsolateFlyoutPanel.displayName = 'EndpointIsolateFlyoutPanel';
