/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import chrome from 'ui/chrome';
import uuid from 'uuid';
import { isEmpty } from 'lodash';
import {
  SERVICE_NAME,
  PROCESSOR_EVENT,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  ERROR_EXC_MESSAGE,
  ERROR_EXC_HANDLED,
  ERROR_CULPRIT
} from '../../../../../common/constants';
import { createWatch } from '../../../../services/rest';

function getSlackPathUrl(slackUrl) {
  if (slackUrl) {
    const { path } = url.parse(slackUrl);
    return path;
  }
}

export async function createErrorGroupWatch({
  emails = [],
  schedule,
  serviceName,
  slackUrl,
  threshold,
  timeRange
}) {
  const id = `apm-${uuid.v4()}`;
  const apmIndexPattern = chrome.getInjected('apmIndexPattern');

  const slackUrlPath = getSlackPathUrl(slackUrl);
  const emailTemplate = `Your service "{{ctx.metadata.serviceName}}" has error groups which exceeds {{ctx.metadata.threshold}} occurrences within "{{ctx.metadata.timeRangeHumanReadable}}"

{{#ctx.payload.aggregations.error_groups.buckets}}
<strong>{{sample.hits.hits.0._source.error.log.message}}{{^sample.hits.hits.0._source.error.log.message}}{{sample.hits.hits.0._source.error.exception.message}}{{/sample.hits.hits.0._source.error.log.message}}</strong>
{{sample.hits.hits.0._source.error.culprit}}{{^sample.hits.hits.0._source.error.culprit}}N/A{{/sample.hits.hits.0._source.error.culprit}}
{{doc_count}} occurrences
{{/ctx.payload.aggregations.error_groups.buckets}}`.replace(/\n/g, '<br/>');

  const slackTemplate = `Your service "{{ctx.metadata.serviceName}}" has error groups which exceeds {{ctx.metadata.threshold}} occurrences within "{{ctx.metadata.timeRangeHumanReadable}}"
{{#ctx.payload.aggregations.error_groups.buckets}}
>*{{sample.hits.hits.0._source.error.log.message}}{{^sample.hits.hits.0._source.error.log.message}}{{sample.hits.hits.0._source.error.exception.message}}{{/sample.hits.hits.0._source.error.log.message}}*
>{{#sample.hits.hits.0._source.error.culprit}}\`{{sample.hits.hits.0._source.error.culprit}}\`{{/sample.hits.hits.0._source.error.culprit}}{{^sample.hits.hits.0._source.error.culprit}}N/A{{/sample.hits.hits.0._source.error.culprit}}
>{{doc_count}} occurrences
{{/ctx.payload.aggregations.error_groups.buckets}}`;

  const body = {
    metadata: {
      emails,
      trigger: 'This value must be changed in trigger section',
      serviceName,
      threshold,
      timeRange,
      timeRangeHumanReadable: timeRange.replace('now-', ''),
      slackUrlPath
    },
    trigger: {
      schedule
    },
    input: {
      search: {
        request: {
          indices: [apmIndexPattern],
          body: {
            size: 0,
            query: {
              bool: {
                filter: [
                  { term: { [SERVICE_NAME]: '{{ctx.metadata.serviceName}}' } },
                  { term: { [PROCESSOR_EVENT]: 'error' } },
                  {
                    range: {
                      '@timestamp': {
                        gte: '{{ctx.metadata.timeRange}}'
                      }
                    }
                  }
                ]
              }
            },
            aggs: {
              error_groups: {
                terms: {
                  min_doc_count: '{{ctx.metadata.threshold}}',
                  field: ERROR_GROUP_ID,
                  size: 10,
                  order: {
                    _count: 'desc'
                  }
                },
                aggs: {
                  sample: {
                    top_hits: {
                      _source: [
                        ERROR_LOG_MESSAGE,
                        ERROR_EXC_MESSAGE,
                        ERROR_EXC_HANDLED,
                        ERROR_CULPRIT,
                        ERROR_GROUP_ID,
                        '@timestamp'
                      ],
                      sort: [
                        {
                          '@timestamp': 'desc'
                        }
                      ],
                      size: 1
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    condition: {
      script: {
        source:
          'return ctx.payload.aggregations.error_groups.buckets.length > 0'
      }
    },
    actions: {
      log_error: {
        logging: {
          text: emailTemplate
        }
      }
    }
  };

  if (slackUrlPath) {
    body.actions.slack_webhook = {
      webhook: {
        scheme: 'https',
        host: 'hooks.slack.com',
        port: 443,
        method: 'POST',
        path: '{{ctx.metadata.slackUrlPath}}',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: slackTemplate
        })
      }
    };
  }

  if (!isEmpty(emails)) {
    body.actions.email = {
      email: {
        to: '{{#join}}ctx.metadata.emails{{/join}}',
        subject: `"{{ctx.metadata.serviceName}}" has error groups which exceeds the threshold`,
        body: {
          html: emailTemplate
        }
      }
    };
  }

  await createWatch(id, body);
  return id;
}
