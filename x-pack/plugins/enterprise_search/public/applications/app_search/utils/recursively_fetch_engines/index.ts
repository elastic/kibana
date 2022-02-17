/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flashAPIErrors } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';

import { EngineDetails } from '../../components/engine/types';
import { EnginesAPIResponse } from '../../components/engines/types';

interface Params {
  endpoint: string;
  onComplete: (engines: EngineDetails[]) => void;
  query?: object;
  pageSize?: number;
}

export const recursivelyFetchEngines = ({
  endpoint,
  onComplete,
  query = {},
  pageSize = 25,
}: Params) => {
  const { http } = HttpLogic.values;

  let enginesAccumulator: EngineDetails[] = [];

  const fetchEngines = async (page = 1) => {
    try {
      const { meta, results }: EnginesAPIResponse = await http.get(endpoint, {
        query: {
          'page[current]': page,
          'page[size]': pageSize,
          ...query,
        },
      });

      enginesAccumulator = [...enginesAccumulator, ...results];

      if (page >= meta.page.total_pages) {
        onComplete(enginesAccumulator);
      } else {
        fetchEngines(page + 1);
      }
    } catch (e) {
      flashAPIErrors(e);
    }
  };

  fetchEngines();
};
