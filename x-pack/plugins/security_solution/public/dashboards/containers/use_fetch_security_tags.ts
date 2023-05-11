/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { getTagsByName, createTag } from '../../common/containers/tags/api';
import { REQUEST_NAMES, useFetch } from '../../common/hooks/use_fetch';
import { SECURITY_TAG_DESCRIPTION, SECURITY_TAG_NAME } from '../../../common/constants';

export const useFetchSecurityTags = () => {
  const { http } = useKibana().services;
  const abortController = useRef(new AbortController());

  const {
    fetch,
    data: tags,
    isLoading,
    error,
  } = useFetch(REQUEST_NAMES.SECURITY_TAGS, async () => {
    const securityTags = await getTagsByName(
      http,
      SECURITY_TAG_NAME,
      abortController.current.signal
    );
    if (securityTags.length === 0) {
      const tag = await createTag(http, {
        name: SECURITY_TAG_NAME,
        description: SECURITY_TAG_DESCRIPTION,
      });
      securityTags.push(tag);
    }
    return securityTags;
  });

  useEffect(() => {
    fetch({});
  }, [fetch]);

  useEffect(() => {
    const currentAbortController = abortController.current;
    return () => {
      currentAbortController.abort();
    };
  });

  return { tags, isLoading, error };
};
