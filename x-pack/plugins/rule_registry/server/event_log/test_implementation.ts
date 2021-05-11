/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { Schema } from './event_schema';
import { EventLogDefinition, IEventLogService } from './log';

const securityLogDefinition = new EventLogDefinition({
  name: 'security',
  schema: Schema.extendBase({
    'kibana.rac.event_log.log_name': { type: 'keyword' },
    'kibana.rac.event_log.logger_name': { type: 'keyword' },
  } as const),
});

const alertsLogDefinition = securityLogDefinition.defineChild({
  name: 'alerts',
  schema: Schema.create({
    'signal.rule.name': { type: 'text' },
    'kibana.rac.alert.bar': { type: 'keyword' },
  } as const),
});

const executionLogDefinition = securityLogDefinition.defineChild({
  name: 'events',
  schema: Schema.create({
    'event.sequence': { type: 'long' },
    'kibana.rule.execution.status': { type: 'keyword' },
    'kibana.rule.execution.status_severity': { type: 'short' },
  } as const),
});

const SPACE_ID = 'default';

export const testEventLogImplementation = (service: IEventLogService, logger: Logger): void => {
  Promise.resolve()
    .then(async () => {
      await testImplementation(service, logger);
    })
    .catch((e) => {
      logger.error(e);
    });
};

const testImplementation = async (service: IEventLogService, logger: Logger) => {
  // ---------------------------------------------------------------------------
  // Bootstrap logs: for alerts-as-data and rule execution events.

  const logResolver = service.getResolver();

  const alertsLogProvider = logResolver.resolve(alertsLogDefinition, SPACE_ID);
  const executionLogProvider = logResolver.resolve(executionLogDefinition, SPACE_ID);

  debug(logger, 'Alerts log:', {
    name: alertsLogProvider.getLogName(),
    schema: alertsLogProvider.getEventSchema(),
    indexSpec: alertsLogProvider.getIndexSpec(),
  });

  debug(logger, 'Rule execution log:', {
    name: executionLogProvider.getLogName(),
    schema: executionLogProvider.getEventSchema(),
    indexSpec: executionLogProvider.getIndexSpec(),
  });

  const bootstrapIndex = true;

  await alertsLogProvider.getLog(bootstrapIndex);
  const executionLog = await executionLogProvider.getLog(bootstrapIndex);

  // ---------------------------------------------------------------------------
  // Log some rule execution events.

  const baseTemplate = executionLog.getLoggerTemplate({
    'kibana.rac.producer': 'security',
  });

  const ruleTemplate = baseTemplate.getLoggerTemplate({
    'rule.uuid': '1231234sdfgdf4565675sdv',
    'rule.name': 'My rule',
  });

  const ruleLogger = ruleTemplate.getLogger('rule-executor');
  let seq = 0;

  ruleLogger.logEvent({
    '@timestamp': now(),
    'event.sequence': seq++,
    'event.action': 'status-changed',
    'kibana.rule.execution.status': 'going to run',
    'kibana.rule.execution.status_severity': 10,
  });
  ruleLogger.logEvent({
    '@timestamp': now(),
    'event.sequence': seq++,
    'event.action': 'status-changed',
    'kibana.rule.execution.status': 'warning',
    'kibana.rule.execution.status_severity': 30,
  });
  ruleLogger.logEvent({
    '@timestamp': now(),
    'event.sequence': seq++,
    'event.action': 'status-changed',
    'kibana.rule.execution.status': 'failure',
    'kibana.rule.execution.status_severity': 40,
  });

  // Give some time for events to be indexed
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // ---------------------------------------------------------------------------
  // Fetch data from rule execution log.

  const allEvents1 = await executionLog
    .getEvents()
    .filterByLogger('rule-executor')
    .sortBy([{ '@timestamp': { order: 'desc' } }, { 'event.sequence': { order: 'desc' } }])
    .paginate({ page: 1, perPage: 30 })
    .buildQuery()
    .execute();

  debug(logger, 'Data fetching: all events 1', { allEvents1 });

  const allEvents2 = await executionLog
    .getEvents()
    .buildQuery()
    .search({
      body: {
        from: 0,
        size: 30,
        query: {
          bool: {
            filter: [
              { term: { 'kibana.rac.event_log.log_name': 'security.events' } },
              { term: { 'kibana.rac.event_log.logger_name': 'rule-executor' } },
            ],
          },
        },
        sort: [{ '@timestamp': { order: 'desc' } }, { 'event.sequence': { order: 'desc' } }],
      },
    });

  debug(logger, 'Data fetching: all events 2', { allEvents2 });

  const monitoringAggregatedData = await executionLog
    .getEvents()
    .filterByFields({
      'rule.uuid': ['1231234sdfgdf4565675sdv'],
    })
    .buildQuery()
    .search({
      body: {
        size: 0,
        query: {
          bool: {
            filter: [{ term: { 'kibana.rac.producer': 'security' } }],
          },
        },
        aggs: {
          rules: {
            terms: {
              field: 'rule.uuid',
              size: 1,
            },
            aggs: {
              events_status_changed: {
                filter: {
                  term: { 'event.action': 'status-changed' },
                },
                aggs: {
                  last_item: {
                    top_hits: {
                      size: 1,
                      sort: [
                        { '@timestamp': { order: 'desc' } },
                        { 'event.sequence': { order: 'desc' } },
                      ],
                      _source: ['@timestamp', 'event', 'kibana'],
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

  debug(logger, 'Data fetching: aggregated data', { monitoringAggregatedData });
};

const now = (): string => new Date().toISOString();

const debug = (logger: Logger, message: string, meta?: object): void => {
  logger.debug(message);
  if (meta) {
    const metaSerialized = JSON.stringify(meta, null, 2);
    logger.debug(metaSerialized);
  }
};
