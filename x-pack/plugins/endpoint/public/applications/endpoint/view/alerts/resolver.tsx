/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { Provider } from 'react-redux';
import { useKibana } from '../../../../../../../../src/plugins/kibana_react/public';
import { Resolver } from '../../../../embeddables/resolver/view';
import { EndpointPluginServices } from '../../../../plugin';
import { LegacyEndpointEvent } from '../../../../../common/types';
import { storeFactory } from '../../../../embeddables/resolver/store';
import { useAlertListSelector } from './hooks/use_alerts_selector';
import * as selectors from '../../store/alerts/selectors';

export const AlertDetailResolver = styled(
  React.memo(({ className }: { className?: string }) => {
    const alertDetailsData = useAlertListSelector(selectors.selectedAlertDetailsData);
    if (alertDetailsData === undefined) {
      return null;
    }
    const context = useKibana<EndpointPluginServices>();
    const { store } = storeFactory(context);

    return (
      <div className={className} data-test-subj="alertResolver" data-testid="alertResolver">
        <Provider store={store}>
          <Resolver selectedEvent={(alertDetailsData as unknown) as LegacyEndpointEvent} />
        </Provider>
      </div>
    );
  })
)`
  height: 100%;
  width: 100%;
  display: flex;
  flex-grow: 1;
`;
