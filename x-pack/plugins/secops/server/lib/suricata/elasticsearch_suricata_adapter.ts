/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase, get, has } from 'lodash/fp';
import { SuricataEvents } from '../../../common/graphql/types';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { EventData, SuricataAdapter, SuricataRequestOptions } from './types';

const EventFields = [
  'suricata.eve.timestamp',
  'suricata.eve.flow_id',
  'suricata.eve.src_ip',
  'suricata.eve.src_port',
  'suricata.eve.event_type',
  'suricata.eve.proto',
  'suricata.eve.dest_ip',
  'suricata.eve.dest_port',
];

export class ElasticsearchSuricataAdapter implements SuricataAdapter {
  private framework: FrameworkAdapter;
  constructor(framework: FrameworkAdapter) {
    this.framework = framework;
  }

  public async getEvents(
    request: FrameworkRequest,
    options: SuricataRequestOptions
  ): Promise<SuricataEvents[]> {
    const { to, from } = options.timerange;

    const query = {
      allowNoIndices: true,
      index: options.sourceConfiguration.fileAlias,
      ignoreUnavailable: true,
      body: {
        query: {
          bool: {
            filter: [
              {
                range: {
                  [options.sourceConfiguration.fields.timestamp]: {
                    gte: to,
                    lte: from,
                  },
                },
              },
            ],
          },
        },
        size: 500,
        sort: [
          {
            [options.sourceConfiguration.fields.timestamp]: 'desc',
          },
        ],
        _source: EventFields,
      },
    };

    const response = await this.framework.callWithRequest<EventData>(request, 'search', query);

    const hits = response.hits.hits;
    const events = hits.map(formatEventsData(EventFields));
    return events as [SuricataEvents];
  }
}

const formatEventsData = (fields: string[]) => (hit: EventData) =>
  fields.reduce(
    (flattenedFields, fieldName) =>
      has(fieldName, hit._source)
        ? {
            ...flattenedFields,
            [camelCase(fieldName.split('.').pop() as string)]: get(fieldName, hit._source),
          }
        : flattenedFields,
    {} as { [fieldName: string]: string | number | boolean | null }
  );
