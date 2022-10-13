/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useTagsQuery } from '../api/hooks/use_tags_query';
import * as i18n from './translations';

/**
 * Hook for using the list of Tags from the Detection Engine API
 *
 */
export const useTags = () => {
  const { addError } = useAppToasts();

  return useTagsQuery({
    onError: (err) => {
      addError(err, { title: i18n.TAG_FETCH_FAILURE });
    },
  });
};
