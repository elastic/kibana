/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { MlPluginStart } from '../index';
import type { MlUrlGeneratorState } from '../../common/types/ml_url_generator';

/**
 * Provides a URL to ML plugin page
 * TODO remove basePath parameter
 */
export const useMlHref = (
  ml: MlPluginStart | undefined,
  basePath: string | undefined,
  params: MlUrlGeneratorState
) => {
  const [mlLink, setMlLink] = useState<string | undefined>(
    basePath !== undefined ? `${basePath}/app/ml/${params.page}` : undefined
  );

  useEffect(() => {
    let isCancelled = false;
    const generateLink = async () => {
      if (ml?.urlGenerator !== undefined) {
        const href = await ml.urlGenerator.createUrl(params);
        if (!isCancelled) {
          setMlLink(href);
        }
      }
    };
    generateLink();
    return () => {
      isCancelled = true;
    };
  }, [ml?.urlGenerator, params]);

  return mlLink;
};
