/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsMutating } from '@tanstack/react-query';

export const useSloCrudLoading = () => {
  const isCreatingSlo = Boolean(useIsMutating(['creatingSlo']));
  const isUpdatingSlo = Boolean(useIsMutating(['updatingSlo']));
  const isDeletingSlo = Boolean(useIsMutating(['deleteSlo']));

  return isCreatingSlo || isUpdatingSlo || isDeletingSlo;
};
