/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import useMount from 'react-use/lib/useMount';
import { i18n } from '@kbn/i18n';

import { WorkpadFindResponse } from '../../../services/workpad';

import { useNotifyService, useWorkpadService } from '../../../services';
const emptyResponse = { total: 0, workpads: [] };

export const useFindWorkpads = () => {
  const workpadService = useWorkpadService();
  const notifyService = useNotifyService();

  return useCallback(
    async (text = '') => {
      try {
        return await workpadService.find(text);
      } catch (err) {
        notifyService.error(err, { title: errors.getFindFailureErrorMessage() });
      }
    },
    [notifyService, workpadService]
  );
};

export const useFindWorkpadsOnMount = (): [boolean, WorkpadFindResponse] => {
  const [isMounted, setIsMounted] = useState(false);
  const findWorkpads = useFindWorkpads();
  const [workpadResponse, setWorkpadResponse] = useState<WorkpadFindResponse>(emptyResponse);

  const fetchWorkpads = useCallback(async () => {
    const foundWorkpads = await findWorkpads();
    setWorkpadResponse(foundWorkpads || emptyResponse);
    setIsMounted(true);
  }, [findWorkpads]);

  useMount(() => {
    fetchWorkpads();
    return () => setIsMounted(false);
  });

  return [isMounted, workpadResponse];
};

const errors = {
  getFindFailureErrorMessage: () =>
    i18n.translate('xpack.canvas.error.useFindWorkpads.findFailureErrorMessage', {
      defaultMessage: `Couldn't find workpad`,
    }),
};
