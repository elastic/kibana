/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMlKibana } from './kibana_context';
import { ML_APP_URL_GENERATOR } from '../../../../common/constants/ml_url_generator';

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
