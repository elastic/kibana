/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useUrlParams } from './use_url_params';

/**
 * Replaces old page_index and page_size url params by the new ones, page and pageSize
 *
 * NOTE: This hook will also increment the `page_index` by 1 since `page` is now one-based
 */
export const useOldUrlSearchPaginationReplace = (): void => {
  const history = useHistory();
  const { urlParams } = useUrlParams();

  useEffect(() => {
    if ((urlParams.page_index && !urlParams.page) || (urlParams.page_size && !urlParams.pageSize)) {
      history.replace(
        `${history.location.pathname}${history.location.search
          .replaceAll('page_size', 'pageSize')
          .replaceAll(
            `page_index=${urlParams.page_index}`,
            `page=${Number(urlParams.page_index) + 1}`
          )}`
      );
    }
  }, [history, urlParams.page, urlParams.pageSize, urlParams.page_index, urlParams.page_size]);
};
