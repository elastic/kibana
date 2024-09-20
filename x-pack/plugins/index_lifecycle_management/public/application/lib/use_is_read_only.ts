/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN } from '../../../common/constants';
import { useKibana } from '../../shared_imports';

export const useIsReadOnly = () => {
  const {
    services: { capabilities },
  } = useKibana();
  const ilmCaps = capabilities[PLUGIN.ID];
  const savePermission = Boolean(ilmCaps.save);
  const showPermission = Boolean(ilmCaps.show);
  return !savePermission && showPermission;
};
