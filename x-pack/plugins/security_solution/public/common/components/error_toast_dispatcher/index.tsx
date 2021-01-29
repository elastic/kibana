/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { useDeepEqualSelector } from '../../hooks/use_selector';
import { appSelectors } from '../../store';
import { appActions } from '../../store/app';
import { useStateToaster } from '../toasters';

interface OwnProps {
  toastLifeTimeMs?: number;
}

const ErrorToastDispatcherComponent: React.FC<OwnProps> = ({ toastLifeTimeMs = 5000 }) => {
  const dispatch = useDispatch();
  const getErrorSelector = useMemo(() => appSelectors.errorsSelector(), []);
  const errors = useDeepEqualSelector(getErrorSelector);
  const [{ toasts }, dispatchToaster] = useStateToaster();

  useEffect(() => {
    errors.forEach(({ id, title, message }) => {
      if (!toasts.some((toast) => toast.id === id)) {
        dispatchToaster({
          type: 'addToaster',
          toast: {
            color: 'danger',
            id,
            iconType: 'alert',
            title,
            errors: message,
            toastLifeTimeMs,
          },
        });
      }
      dispatch(appActions.removeError({ id }));
    });
  }, [dispatch, dispatchToaster, errors, toastLifeTimeMs, toasts]);

  return null;
};

ErrorToastDispatcherComponent.displayName = 'ErrorToastDispatcherComponent';

export const ErrorToastDispatcher = React.memo(ErrorToastDispatcherComponent);
