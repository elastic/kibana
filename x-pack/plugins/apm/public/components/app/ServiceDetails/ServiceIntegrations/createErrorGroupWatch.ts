/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import chrome from 'ui/chrome';
import url from 'url';
import uuid from 'uuid';
import {
  ERROR_CULPRIT,
  ERROR_EXC_HANDLED,
  ERROR_EXC_MESSAGE,
  ERROR_GROUP_ID,
  ERROR_LOG_MESSAGE,
  PROCESSOR_EVENT,
  SERVICE_NAME
} from '../../../../../common/elasticsearch_fieldnames';
import { StringMap } from '../../../../../typings/common';
// @ts-ignore
import { createWatch } from '../../../../services/rest/watcher';

function getSlackPathUrl(slackUrl?: string) {
  if (slackUrl) {
    const { path } = url.parse(slackUrl);
    return path;
  }
}

export interface Schedule {
  interval?: string;
  daily?: {
    at: string;
  };
}

interface Arguments {
  emails: string[];
  schedule: Schedule;
  serviceName: string;
  slackUrl?: string;
  threshold: number;
  timeRange: {
    value: number;
    unit: string;
  };
}

interface Actions {
  log_error: { logging: { text: string } };
  slack_webhook?: StringMap;
  email?: StringMap;
}

export async function createErrorGroupWatch({
  emails = [],
  schedule,
  serviceName,
  slackUrl,
  threshold,
  timeRange
}: Arguments) {
  const id = `apm-${uuid.v4()}`;
  const apmIndexPatternTitle = chrome.getInjected('apmIndexPatternTitle');

  const slackUrlPath = getSlackPathUrl(slackUrl);
  const emailTemplate = i18n.translate(
    'xpack.apm.serviceDetails.enableErrorReportsPanel.emailTemplateText',
    {
      defaultMessage:
        'Your service {serviceName} has error groups which exceeds {threshold} occurrences within {timeRange}{br}' +
        '{br}' +
        '{errorGroupsBuckets}{br}' +
        '{errorLogMessage}{br}' +
        '{errorCulprit}N/A{slashErrorCulprit}{br}' +
        '{docCountParam} occurrences{br}' +
        '{slashErrorGroupsBucket}',
      values: {
        serviceName: '"{{ctx.metadata.serviceName}}"',
        threshold: '{{ctx.metadata.threshold}}',
        timeRange:
          '"{{ctx.metadata.timeRangeValue}}{{ctx.metadata.timeRangeUnit}}"',
        errorGroupsBuckets:
          '{{#ctx.payload.aggregations.error_groups.buckets}}',
        errorLogMessage:
          '<strong>{{sample.hits.hits.0._source.error.log.message}}{{^sample.hits.hits.0._source.error.log.message}}{{sample.hits.hits.0._source.error.exception.0.message}}{{/sample.hits.hits.0._source.error.log.message}}</strong>',
        errorCulprit:
          '{{sample.hits.hits.0._source.error.culprit}}{{^sample.hits.hits.0._source.error.culprit}}',
        slashErrorCulprit: '{{/sample.hits.hits.0._source.error.culprit}}',
        docCountParam: '{{doc_count}}',
        slashErrorGroupsBucket:
          '{{/ctx.payload.aggregations.error_groups.buckets}}',
        br: '<br/>'
      }
    }
  );

  const slackTemplate = i18n.translate(
    'xpack.apm.serviceDetails.enableErrorReportsPanel.slackTemplateText',
    {
      defaultMessage: `Your service {serviceName} has error groups which exceeds {threshold} occurrences within {timeRange}
{errorGroupsBuckets}
{errorLogMessage}
{errorCulprit}N/A{slashErrorCulprit}
{docCountParam} occurrences
{slashErrorGroupsBucket}`,
      values: {
        serviceName: '"{{ctx.metadata.serviceName}}"',
        threshold: '{{ctx.metadata.threshold}}',
        timeRange:
          '"{{ctx.metadata.timeRangeValue}}{{ctx.metadata.timeRangeUnit}}"',
        errorGroupsBuckets:
          '{{#ctx.payload.aggregations.error_groups.buckets}}',
        errorLogMessage:
          '>*{{sample.hits.hits.0._source.error.log.message}}{{^sample.hits.hits.0._source.error.log.message}}{{sample.hits.hits.0._source.error.exception.0.message}}{{/sample.hits.hits.0._source.error.log.message}}*',
        errorCulprit:
          '>{{#sample.hits.hits.0._source.error.culprit}}`{{sample.hits.hits.0._source.error.culprit}}`{{/sample.hits.hits.0._source.error.culprit}}{{^sample.hits.hits.0._source.error.culprit}}',
        slashErrorCulprit: '{{/sample.hits.hits.0._source.error.culprit}}',
        docCountParam: '>{{doc_count}}',
        slashErrorGroupsBucket:
          '{{/ctx.payload.aggregations.error_groups.buckets}}'
      }
    }
  );

  const actions: Actions = {
    log_error: { logging: { text: emailTemplate } }
  };

  const body = {
    metadata: {
      emails,
      trigger: i18n.translate(
        'xpack.apm.serviceDetails.enableErrorReportsPanel.triggerText',
        {
          defaultMessage: 'This value must be changed in trigger section'
        }
      ),
      serviceName,
      threshold,
      timeRangeValue: timeRange.value,
      timeRangeUnit: timeRange.unit,
      slackUrlPath
    },
    trigger: {
      schedule
    },
    input: {
      search: {
        request: {
          indices: [apmIndexPatternTitle],
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
                        gte:
                          'now-{{ctx.metadata.timeRangeValue}}{{ctx.metadata.timeRangeUnit}}'
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
    actions
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
        body: `__json__::${JSON.stringify({
          text: slackTemplate
        })}`
      }
    };
  }

  if (!isEmpty(emails)) {
    body.actions.email = {
      email: {
        to: '{{#join}}ctx.metadata.emails{{/join}}',
        subject: i18n.translate(
          'xpack.apm.serviceDetails.enableErrorReportsPanel.emailSubjectText',
          {
            defaultMessage:
              '{serviceName} has error groups which exceeds the threshold',
            values: { serviceName: '"{{ctx.metadata.serviceName}}"' }
          }
        ),
        body: {
          html: emailTemplate
        }
      }
    };
  }

  await createWatch(id, body);
  return id;
}
