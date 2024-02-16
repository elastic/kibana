/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';

import { useMlKibana } from '../../../../contexts/kibana';

export const useHasRequiredIndicesPermissions = () => {
  const [hasIndexPermissions, setHasIndexPermissions] = useState<boolean>(false);
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
        const privileges = await hasPrivileges({
          index: [
            {
              names: ['*'], // uses wildcard
              privileges: ['create_index', 'manage', 'index', 'read'],
            },
          ],
        });

        setHasIndexPermissions(
          privileges.hasPrivileges === undefined ||
            privileges.hasPrivileges.has_all_requested === true
        );
      }
      if (hasPrivileges !== undefined) {
        checkPrivileges();
      }
    },
    [hasPrivileges]
  );

  return hasIndexPermissions;
};
