/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { Provider } from 'react-redux';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { ResolverEvent } from '../../../common/endpoint/types';
import { StartServices } from '../../types';
import { storeFactory } from '../../resolver/store';
import { Resolver } from '../../resolver/view';

const AlertDetailResolverComponents = React.memo(
  ({ className, selectedEvent }: { className?: string; selectedEvent?: ResolverEvent }) => {
    const context = useKibana<StartServices>();
    const { store } = storeFactory(context);

    return (
      <div className={className} data-test-subj="alertResolver">
        <Provider store={store}>
          <Resolver selectedEvent={selectedEvent} />
        </Provider>
      </div>
    );
  }
);

AlertDetailResolverComponents.displayName = 'AlertDetailResolver';

export const AlertDetailResolver = styled(AlertDetailResolverComponents)`
  height: 100%;
  width: 100%;
  display: flex;
  flex-grow: 1;
  min-height: calc(100vh - 505px);
`;
