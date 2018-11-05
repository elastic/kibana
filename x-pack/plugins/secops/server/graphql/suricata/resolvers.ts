/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SourceResolvers } from '../../../common/graphql/types';
import { AppResolvedResult, AppResolverOf } from '../../lib/framework';
import { Suricata } from '../../lib/suricata';
import { SuricataRequestOptions } from '../../lib/suricata/types';
import { Context } from '../../lib/types';
import { parseFilterQuery } from '../../utils/serialized_query';
import { QuerySourceResolver } from '../sources/resolvers';

type QuerySuricataResolver = AppResolverOf<
  SourceResolvers.GetSuricataEventsResolver,
  AppResolvedResult<QuerySourceResolver>,
  Context
>;

interface SuricataResolversDeps {
  suricata: Suricata;
}

export const createSuricataResolvers = (
  libs: SuricataResolversDeps
): {
  Source: {
    getSuricataEvents: QuerySuricataResolver;
  };
} => ({
  Source: {
    async getSuricataEvents(source, args, { req }) {
      const options: SuricataRequestOptions = {
        sourceConfiguration: source.configuration,
        timerange: args.timerange,
        filterQuery: parseFilterQuery(args.filterQuery || ''),
      };
      const data = libs.suricata.getEvents(req, options);
      return data;
    },
  },
});
