/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { useKibana } from '../common/lib/kibana';

export const useFetchStatus = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [permissionDenied, setPermissionDenied] = useState<boolean>(false);
  const { http } = useKibana().services;

  useEffect(() => {
    const fetchStatus = () => {
      http
        .get<{ install_status: string }>('/internal/osquery/status')
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
  }, [http]);

  return { loading, disabled, permissionDenied };
};
