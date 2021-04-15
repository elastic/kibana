/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { useUrlParams } from './use_url_params';

type Modal = 'settings';

/**
 * Uses URL params for pagination and also persists those to the URL as they are updated
 */
export const useUrlModal = () => {
  const location = useLocation();
  const history = useHistory();
  const { urlParams, toUrlParams } = useUrlParams();

  const setModal = useCallback(
    (modal: Modal | null) => {
      const newUrlParams: any = {
        ...urlParams,
        modal,
      };

      if (modal === null) {
        delete newUrlParams.modal;
      }
      history.push({
        ...location,
        search: toUrlParams(newUrlParams),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const getModalHref = useCallback(
    (modal: Modal | null) => {
      return history.createHref({
        ...location,
        search: toUrlParams({
          ...urlParams,
          modal,
        }),
      });
    },
    [history, location, toUrlParams, urlParams]
  );

  const modal: Modal | null = useMemo(() => {
    if (urlParams.modal === 'settings') {
      return urlParams.modal;
    }

    return null;
  }, [urlParams.modal]);

  return {
    modal,
    setModal,
    getModalHref,
  };
};
