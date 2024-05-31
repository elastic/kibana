/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

import { useMlKibana } from '../../../../contexts/kibana';

export const useHasRequiredIndicesPermissions = (
  indexName: string,
  isDestIndex: boolean = false
) => {
  const [hasIndexPermissions, setHasIndexPermissions] = useState<boolean>(true);
  const {
    services: {
      mlServices: {
        mlApiServices: { hasPrivileges },
      },
    },
  } = useMlKibana();

  useEffect(
    function checkRequiredIndexPermissions() {
      async function checkPrivileges() {
        const sourceIndexPriv = ['view_index_metadata'];
        const destIndexPriv = ['create_index', 'manage', 'index'];

        const privileges = await hasPrivileges({
          index: [
            {
              names: [indexName],
              privileges: ['read', ...(isDestIndex ? destIndexPriv : sourceIndexPriv)],
            },
          ],
        });

        setHasIndexPermissions(privileges.hasPrivileges?.has_all_requested === true);
      }

      checkPrivileges();
    },
    [hasPrivileges, indexName, isDestIndex]
  );

  if (indexName === '') {
    return;
  }

  return hasIndexPermissions;
};
