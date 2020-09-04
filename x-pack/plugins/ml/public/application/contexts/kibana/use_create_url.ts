/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMlKibana } from './kibana_context';
import { ML_APP_URL_GENERATOR } from '../../../../common/constants/ml_url_generator';
import { MlUrlGeneratorState } from '../../../../common/types/ml_url_generator';

export const useMlUrlGenerator = () => {
  const {
    services: {
      share: {
        urlGenerators: { getUrlGenerator },
      },
    },
  } = useMlKibana();

  return getUrlGenerator(ML_APP_URL_GENERATOR);
};

export const useMlLink = (params: MlUrlGeneratorState): string | undefined => {
  const [href, setHref] = useState<string | undefined>(undefined);
  const mlUrlGenerator = useMlUrlGenerator();

  const generateUrl = useCallback(async () => {
    const url = await mlUrlGenerator.createUrl(params);
    setHref(url);
  }, []);
  useEffect(() => {
    generateUrl();
  }, [params]);

  return href;
};
