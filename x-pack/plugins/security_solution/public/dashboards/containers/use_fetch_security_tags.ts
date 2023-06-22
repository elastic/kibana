/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useKibana } from '../../common/lib/kibana';
import { createTag, getTagsByName } from '../../common/containers/tags/api';
import { REQUEST_NAMES, useFetch } from '../../common/hooks/use_fetch';
import { SECURITY_TAG_DESCRIPTION, SECURITY_TAG_NAME } from '../../../common/constants';

export const useFetchSecurityTags = () => {
  const { http } = useKibana().services;
  const tagCreated = useRef(false);

  const {
    data: tags,
    isLoading: isLoadingTags,
    error: errorFetchTags,
  } = useFetch(REQUEST_NAMES.SECURITY_TAGS, getTagsByName, {
    initialParameters: { http, tagName: SECURITY_TAG_NAME },
  });

  const {
    fetch: fetchCreateTag,
    data: tag,
    isLoading: isLoadingCreateTags,
    error: errorCreateTag,
  } = useFetch(REQUEST_NAMES.SECURITY_CREATE_TAG, createTag);

  useEffect(() => {
    if (!isLoadingTags && !errorFetchTags && tags && tags.length === 0 && !tagCreated.current) {
      tagCreated.current = true;
      fetchCreateTag({
        http,
        tag: { name: SECURITY_TAG_NAME, description: SECURITY_TAG_DESCRIPTION },
      });
    }
  }, [errorFetchTags, fetchCreateTag, http, isLoadingTags, tags]);

  const tagsResult = useMemo(() => {
    if (tags?.length) {
      return tags;
    }
    return tag ? [tag] : undefined;
  }, [tags, tag]);

  return {
    tags: tagsResult,
    isLoading: isLoadingTags || isLoadingCreateTags,
    error: errorFetchTags || errorCreateTag,
  };
};
