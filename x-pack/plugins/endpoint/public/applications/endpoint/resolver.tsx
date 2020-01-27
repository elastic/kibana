/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import { EuiRange, EuiPanel, EuiIcon } from '@elastic/eui';
import { useSelector, useDispatch } from 'react-redux';
import { ResolverAction, PanDirection } from '../types';
import { usePageId } from './view/use_page_id';
import { AppRoot } from '../../embeddables/resolver/view';
import { storeFactory } from '../../embeddables/resolver/store';

export const Resolver = styled(
  React.memo(({ className }: { className?: string }) => {
    usePageId('resolverPage');
    const dispatch: (action: ResolverAction) => unknown = useDispatch();
    const resolverStore = storeFactory();
    return (
      <div className={className}>
        <AppRoot store={resolverStore.store} />
      </div>
    );
  })
)`
  display: flex;
  flex-grow: 1;
`;
