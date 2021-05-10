/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { KibanaRequest } from 'kibana/server';
// import { Schema } from './event_schema';
// import { EventLogDefinition } from './log';
// import { IEventLogService } from './log/public_api';

// // -------------------------------------------------------------------------------------------------
// // Schema

// function createSchemaAndEvent() {
//   const eventSchema = Schema.getBase();
//   type EventType = typeof eventSchema.objectType;

//   const event: EventType = {
//     '@timestamp': 'now',

//     // Note: this works in terms of type compatibility with schema based on FieldMap
//     'event.kind': 'event',
//     'event.action': 'change',

//     // Note: this is not compatible with schema definition based on FieldMap
//     // event: {
//     //   kind: 'event',
//     //   action: 'change',
//     // },
//   };
// }

// // -------------------------------------------------------------------------------------------------
// // Definition API (defining log hierarchies as simple objects)

// function defineLogs() {
//   const securityLogDefinition = new EventLogDefinition({
//     name: 'security',
//     schema: Schema.extendBase({
//       'kibana.rac.security.foo': { type: 'long' },
//     } as const),
//   });

//   const alertsLogDefinition = securityLogDefinition.defineChild({
//     name: 'alerts',
//     schema: Schema.create({
//       'signal.rule.name': { type: 'text' },
//       'kibana.rac.alert.bar': { type: 'keyword' },
//     } as const),
//   });

//   const executionLogDefinition = securityLogDefinition.defineChild({
//     name: 'events',
//     schema: Schema.create({
//       'kibana.rule.execution.status': { type: 'keyword' },
//       'kibana.rule.execution.status_severity': { type: 'short' },
//     } as const),
//   });

//   return { alertsLogDefinition, executionLogDefinition };
// }

// // -------------------------------------------------------------------------------------------------
// // Resolving and bootstrapping API (creating runtime objects representing logs, bootstrapping indices)

// const service = {} as IEventLogService;
// const httpRequest = {} as KibanaRequest;

// function resolveLogsInHttpRouteHandlers() {
//   const { alertsLogDefinition, executionLogDefinition } = defineLogs();

//   // Scoped log resolver is bound to a HTTP request and so a kibana space.
//   // Scoped log resolver is supposed to be injected into HTTP route handlers.
//   // It will be available to handlers through `context.ruleRegistry.eventLog`.
//   const logResolver = service.getScopedResolver(httpRequest);

//   // In route handlers we will be able to resolve a log by its definition and get
//   // the log that will correspond to kibana space id of the current HTTP request.
//   const alertsLogProvider = logResolver.resolve(alertsLogDefinition);
//   const executionLogProvider = logResolver.resolve(executionLogDefinition);

//   return { alertsLogProvider, executionLogProvider };
// }

// function resolveLogsInRuleExecutorFunctions() {
//   const { alertsLogDefinition, executionLogDefinition } = defineLogs();

//   // This log resolver is not bound to any particular HTTP request.
//   // It accepts kibana space id as a parameter.
//   const logResolver = service.getResolver();

//   // Log resolver will be available to executor functions via dependency injection.
//   // In executors we know spaceId, it's passed by Alerting framework via parameters.
//   const spaceId = 'some value passed to executor function by Alerting framework';

//   // This way we'll be able to resolve logs in executors.
//   const alertsLogProvider = logResolver.resolve(alertsLogDefinition, spaceId);
//   const executionLogProvider = logResolver.resolve(executionLogDefinition, spaceId);

//   return { alertsLogProvider, executionLogProvider };
// }

// async function bootstrapLogsInHttpRouteHandlers() {
//   const { alertsLogProvider, executionLogProvider } = resolveLogsInHttpRouteHandlers();

//   const bootstrapIndex = true;
//   const alertsLog = await alertsLogProvider.getLog(bootstrapIndex);
//   const executionLog = await executionLogProvider.getLog(bootstrapIndex);

//   return {
//     alertsLog,
//     executionLog,
//   };
// }

// async function getLogsInRuleExecutorFunctions() {
//   const { alertsLogProvider, executionLogProvider } = resolveLogsInRuleExecutorFunctions();

//   const bootstrapIndex = false;
//   const alertsLog = await alertsLogProvider.getLog(bootstrapIndex);
//   const executionLog = await executionLogProvider.getLog(bootstrapIndex);

//   return {
//     alertsLog,
//     executionLog,
//   };
// }

// // -------------------------------------------------------------------------------------------------
// // Write API (logging events)

// async function hierarchicalLoggers() {
//   const { executionLog } = await getLogsInRuleExecutorFunctions();

//   // Base logger template with some default field values. These fields will be
//   // written with any event logged via any logger created from this template.
//   const baseTemplate = executionLog.getLoggerTemplate({
//     'kibana.rac.producer': 'security',
//     'kibana.rac.security.foo': 42,
//   });

//   // Logger template scoped to a specific rule instance.
//   const ruleTemplate = baseTemplate.getLoggerTemplate({
//     'rule.uuid': '1231234sdfgdf4565675sdv',
//     'rule.name': 'My rule',
//   });

//   // Example of a logger that could be used from http routes when producing
//   // execution-related events from routes. E.g. enabling/disabling rules etc.
//   const httpRouteLogger = baseTemplate.getLogger('http-route');

//   // Example of a logger that could be created in an executor function of
//   // detection engine rule type.
//   const ruleLogger = ruleTemplate.getLogger('rule-executor');

//   const thresholdRuleLogger = ruleLogger.getLogger('threshold-rule-executor', {
//     // some fields specific to threshold rules
//   });

//   ruleLogger.logEvent({
//     '@timestamp': 'now',
//     'kibana.rule.execution.status': 'warning',
//   });
// }

// // -------------------------------------------------------------------------------------------------
// // Read API (searching, filtering, sorting, pagination, aggregation over events)

// async function simpleSearch() {
//   const { executionLog } = await bootstrapLogsInHttpRouteHandlers();

//   const query = executionLog
//     .getEvents()
//     .filterByLogger('rule-executor')
//     .filterByFields({
//       'kibana.rule.execution.status': 'warning',
//       'rule.uuid': '1231234sdfgdf4565675sdv',
//     })
//     .filterByKql('rule.uuid: 1231234sdfgdf4565675sdv')
//     .sortBy([{ '@timestamp': { order: 'desc' } }, { 'event.sequence': { order: 'desc' } }])
//     .paginate({ page: 2, perPage: 30 })
//     .buildQuery();

//   const executionEvents = await query.execute();
// }

// async function freeFormSearch() {
//   const { executionLog } = await bootstrapLogsInHttpRouteHandlers();

//   const query = executionLog.getEvents().buildQuery();

//   const result = await query.search({
//     body: {
//       from: 50,
//       size: 50,
//       query: {
//         bool: {
//           filter: [
//             { term: { 'kibana.rac.event_log.logger': 'rule-executor' } },
//             { term: { 'rule.uuid': '1231234sdfgdf4565675sdv' } },
//           ],
//         },
//       },
//       sort: [{ '@timestamp': { order: 'desc' } }, { 'event.sequence': { order: 'desc' } }],
//     },
//   });
// }

// async function aggregations() {
//   const { executionLog } = await bootstrapLogsInHttpRouteHandlers();

//   const query = executionLog.getEvents().filterByLogger('rule-executor').buildQuery();

//   const result = await query.search({
//     body: {
//       size: 0,
//       query: {
//         bool: {
//           filter: [
//             {
//               terms: {
//                 'rule.uuid': [
//                   '1231234sdfgdf4565675sdv',
//                   'sdfsdfgkjhsf712342734',
//                   'sdfjhskjdvhf2783423',
//                 ],
//               },
//             },
//             { term: { 'event.action': 'status-changed' } },
//           ],
//         },
//       },
//       aggs: {
//         rules: {
//           terms: {
//             field: 'rule.uuid',
//             size: 3,
//           },
//           aggs: {
//             current_status: {
//               top_hits: {
//                 size: 1,
//                 sort: [
//                   { '@timestamp': { order: 'desc' } },
//                   { 'event.sequence': { order: 'desc' } },
//                 ],
//                 _source: ['@timestamp', 'kibana.rac'],
//               },
//             },
//           },
//         },
//       },
//     },
//   });
// }
