/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useCallback } from 'react';

import { useDispatch, useSelector } from 'react-redux';
// @ts-expect-error untyped local
import * as pageActions from '../../state/actions/pages';
import { canUserWrite } from '../../state/selectors/app';
import { isWriteable } from '../../state/selectors/workpad';
import { PagePreview as Component, Props } from './page_preview.component';
import { State } from '../../../types';
import { WorkpadRoutingContext } from '../../routes/workpad';

export const PagePreview: FC<Omit<Props, 'onDuplicate' | 'isWriteable'>> = (props) => {
  const dispatch = useDispatch();
  const stateFromProps = useSelector((state: State) => ({
    isWriteable: isWriteable(state) && canUserWrite(state),
  }));
  const { gotoPage } = useContext(WorkpadRoutingContext);

  const onDuplicate = useCallback(
    (id: string) => {
      dispatch(pageActions.duplicatePage({ id, gotoPage }));
    },
    [dispatch, gotoPage]
  );

  return (
    <Component {...props} onDuplicate={onDuplicate} isWriteable={stateFromProps.isWriteable} />
  );
};
