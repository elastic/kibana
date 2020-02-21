/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { Provider } from 'react-redux';
import { CoreStart } from 'kibana/public';
import { Resolver } from '../../../../embeddables/resolver/view';
import { storeFactory } from '../../../../embeddables/resolver/store';

export const AlertDetailResolver = styled(
  React.memo(
    ({
      className,
      selectedEvent,
      coreStart,
    }: {
      className?: string;
      selectedEvent: object;
      coreStart: CoreStart;
    }) => {
      const { store } = storeFactory(coreStart);
      return (
        <div className={className}>
          <Provider store={store}>
            <Resolver />
          </Provider>
        </div>
      );
    }
  )
)`
  height: 100%;
  width: 100%;
  display: flex;
  flex-grow: 1;
`;
