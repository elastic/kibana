/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useState, useEffect } from 'react';
import type { PACKAGE_STATUS_ROUTE } from '../../../common/endpoint/constants';

export const OSQUERY_STATUS_ROUTE = '/internal/osquery/status';

type StatusRoute = typeof PACKAGE_STATUS_ROUTE | typeof OSQUERY_STATUS_ROUTE;

export const useFetchStatus = (route: StatusRoute) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const { http } = useKibana().services;

  useEffect(() => {
    const fetchStatus = () => {
      http
        ?.get<{ install_status: string }>(route)
        .then((response) => {
          setLoading(false);
          setDisabled(response?.install_status !== 'installed');
        })
        .catch((err) => {
          setLoading(false);
          if (err.body.statusCode === 403) {
            setPermissionDenied(true);
          }
        });
    };

    fetchStatus();
  }, [http, route]);

  return { loading, disabled, permissionDenied };
};
