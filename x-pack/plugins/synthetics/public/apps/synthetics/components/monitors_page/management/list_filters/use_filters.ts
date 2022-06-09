/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-plugin/public';
import { useMemo } from 'react';
import { ESSearchResponse } from '@kbn/core/types/elasticsearch';
import { syntheticsMonitorType } from '../../../../../../../common/types/saved_objects';

const aggs = {
  types: {
    terms: {
      field: `${syntheticsMonitorType}.attributes.type.keyword`,
      size: 10000,
    },
  },
  tags: {
    terms: {
      field: `${syntheticsMonitorType}.attributes.tags`,
      size: 10000,
    },
  },
  locations: {
    terms: {
      field: `${syntheticsMonitorType}.attributes.locations.id`,
      size: 10000,
    },
  },
};

const esParams = { aggs, index: '', query: {} };

type AggsResponse = ESSearchResponse<unknown, typeof esParams>;

export const useFilters = () => {
  const { savedObjects } = useKibana().services;

  const { data } = useFetcher(async () => {
    const aggs = {
      types: {
        terms: {
          field: `${syntheticsMonitorType}.attributes.type.keyword`,
          size: 10000,
        },
      },
      tags: {
        terms: {
          field: `${syntheticsMonitorType}.attributes.tags`,
          size: 10000,
        },
      },
      locations: {
        terms: {
          field: `${syntheticsMonitorType}.attributes.locations.id`,
          size: 10000,
        },
      },
    };
    return savedObjects?.client.find({
      type: syntheticsMonitorType,
      perPage: 0,
      aggs,
    });
  }, []);

  return useMemo(() => {
    const { types, tags, locations } = (data?.aggregations as AggsResponse['aggregations']) ?? {};
    return {
      types: types?.buckets?.map(({ key }) => key) ?? [],
      tags: tags?.buckets?.map(({ key }) => key) ?? [],
      locations: locations?.buckets?.map(({ key }) => key) ?? [],
    };
  }, [data]);
};
