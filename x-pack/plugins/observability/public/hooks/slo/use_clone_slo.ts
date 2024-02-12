/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { useCallback } from 'react';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { paths } from '../../../common/locators/paths';
import { useKibana } from '../../utils/kibana_react';

export function useCloneSlo() {
  const {
    http: { basePath },
    application: { navigateToUrl },
  } = useKibana().services;

  return useCallback(
    (slo: SLOWithSummaryResponse) => {
      navigateToUrl(
        basePath.prepend(
          paths.observability.sloCreateWithEncodedForm(
            encode({ ...slo, name: `[Copy] ${slo.name}`, id: undefined })
          )
        )
      );
    },
    [navigateToUrl, basePath]
  );
}
