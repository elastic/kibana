/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import { AGENT_ACTIONS_INDEX } from '@kbn/fleet-plugin/common';
import { ACTIONS_INDEX } from '../../../../../../common/constants';
import type { ActionDetailsRequestOptions } from '../../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../../common/utils/build_query';

export const buildActionDetailsQuery = ({
  actionId,
  filterQuery,
  componentTemplateExists,
}: ActionDetailsRequestOptions): ISearchRequestParams => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      match_phrase: {
        action_id: actionId,
      },
    },
  ];

  const dslQuery = {
    allow_no_indices: true,
    index: componentTemplateExists ? `${ACTIONS_INDEX}*` : AGENT_ACTIONS_INDEX,
    ignore_unavailable: true,
    body: {
      query: { bool: { filter } },
      size: 1,
      fields: ['*'],
    },
  };

  return dslQuery;
};
