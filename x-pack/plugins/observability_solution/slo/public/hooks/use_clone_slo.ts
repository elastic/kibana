/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useCallback } from 'react';
import { paths } from '../../common/locators/paths';
import { useKibana } from '../utils/kibana_react';
import { createRemoteSloCloneUrl } from '../utils/slo/remote_slo_urls';
import { useSpace } from './use_space';

export function useCloneSlo() {
  const {
    http: { basePath },
    application: { navigateToUrl },
  } = useKibana().services;
  const spaceId = useSpace();

  return useCallback(
    (slo: SLOWithSummaryResponse) => {
      if (slo.remote) {
        window.open(createRemoteSloCloneUrl(slo, spaceId), '_blank');
      } else {
        const clonePath = paths.sloCreateWithEncodedForm(
          encode({ ...slo, name: `[Copy] ${slo.name}`, id: undefined })
        );
        navigateToUrl(basePath.prepend(clonePath));
      }
    },
    [navigateToUrl, basePath, spaceId]
  );
}
