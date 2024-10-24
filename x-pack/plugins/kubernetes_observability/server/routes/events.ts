/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { estypes } from '@elastic/elasticsearch';
// import { transformError } from '@kbn/securitysolution-es-utils';
// import type { ElasticsearchClient } from '@kbn/core/server';
import { extractFieldValue, Event, toEntries, capitalizeFirstLetter, checkDefaultPeriod } from '../lib/utils';
import { IRouter, Logger } from '@kbn/core/server';
import {
    EVENTS_ROUTE,
} from '../../common/constants';

export const registerEventsRoute = (router: IRouter, logger: Logger) => {
    router.versioned
        .get({
            access: 'internal',
            path: EVENTS_ROUTE,
        })
        .addVersion(
            {
                version: '1',
                validate: {
                    request: {
                        query: schema.object({
                            object: schema.maybe(schema.string()),
                            namespace: schema.maybe(schema.string()),
                            period: schema.maybe(schema.string())
                        }),
                    },
                },
            },
            async (context, request, response) => {

                const client = (await context.core).elasticsearch.client.asCurrentUser;
                const period = checkDefaultPeriod(request.query.period);
                var musts = new Array();
                musts.push(
                    {
                        term: {
                            'Body.object.kind': "Event"
                        }
                    }
                )
                var objectName = '';
                var objectKind = '';
                var namespace = '';
                var message = '';
                if (request.query.object !== undefined) {
                    objectName = request.query.object.split("/")[1];
                    objectKind = request.query.object.split("/")[0];
                    console.log(objectName);
                    console.log(objectKind);
                    musts.push(
                        {
                            term: {
                                'Body.object.regarding.name': objectName,
                            },
                        }
                    )
                    musts.push(
                        {
                            term: {
                                'Body.object.regarding.kind': capitalizeFirstLetter(objectKind),
                            },
                        },
                    )
                }
                if (request.query.namespace !== undefined) {
                    namespace = request.query.namespace;
                    console.log(request.query.namespace);
                    musts.push(
                        {
                            term: {
                                'Body.object.metadata.namespace': namespace,
                            },
                        }
                    )
                }

                const must_not = [
                    {
                        term: {
                            'Body.object.type': "Normal"
                        }
                    }
                ];
                const filter = [
                    {
                        range: {
                            "@timestamp": {
                                "gte": period
                            }
                        }
                    }
                ]
                const dsl: estypes.SearchRequest = {
                    index: ["logs-generic-*"],
                    sort: [{ '@timestamp': 'desc' }],
                    _source: false,
                    fields: [
                        '@timestamp',
                        'Body.object.*',
                    ],
                    query: {
                        bool: {
                            must: musts,
                            must_not: must_not,
                            filter: filter,
                        },
                    },
                };

                const esResponse = await client.search(dsl);
                console.log(esResponse);
                const hits = esResponse.hits.hits;
                console.log(hits.length);

                if (hits.length > 0) {
                    var events = new Array();
                    var lastTime = '';
                    var firstTime = '';
                    for (const [index, hit] of toEntries(hits)) {
                        console.log(hit);
                        var event = {} as Event;
                        const { fields = {} } = hit;
                        const reason = extractFieldValue(fields['Body.object.reason']);
                        const note = extractFieldValue(fields['Body.object.note']);
                        const eventType = extractFieldValue(fields['Body.object.type']);
                        const lastObserved = extractFieldValue(fields['Body.object.series.lastObservedTime']);
                        const kind = extractFieldValue(fields['Body.object.regarding.kind']);
                        const object = extractFieldValue(fields['Body.object.regarding.name']);
                        if (index == 0) {
                            lastTime = extractFieldValue(fields['@timestamp']);
                        }
                        if (index == (hits.length - 1)) {
                            firstTime = extractFieldValue(fields['@timestamp']);
                        }

                        event = {
                            'reason': reason,
                            'note': note,
                            'time': lastObserved,
                            'type': eventType,
                            'kind': kind,
                            'object': object
                        };
                        events.push(event);
                    }

                    if (objectName != '' && namespace != '') {
                        message = `Object ${namespace}/${request.query.object} has ${hits.length} events for the past 5 minutes`;
                    } else if (objectName == '' && namespace != '') {
                        message = `There are ${hits.length} events in namespace ${namespace} for the past 5 minutes`;
                    } else if (objectName == '' && namespace == '') {
                        message = `There are ${hits.length} events in the cluster for the past 5 minutes`;
                    }
                    var time = '';
                    if (firstTime == lastTime) {
                        time = firstTime;
                    } else {
                        time = `From ${firstTime} to ${lastTime}`
                    }

                    return response.ok({
                        body: {
                            time: time,
                            message: message,
                            name: request.query.object,
                            namespace: request.query.namespace,
                            events: events,
                        },
                    });
                } else {
                    if (objectName != '' && namespace != '') {
                        message = `Object ${namespace}/${request.query.object} has no events in the past 5 minutes`;
                    } else if (objectName == '' && namespace != '') {
                        message = `There are no events in namespace ${namespace} for the past 5 minutes`;
                    } else if (objectName == '' && namespace == '') {
                        message = `There are no events in the cluster for the past 5 minutes`;
                    }
                    return response.ok({
                        body: {
                            time: '',
                            message: message,
                            name: request.query.object,
                            namespace: request.query.namespace,
                            reason: "No Events",
                        },
                    });
                }
            }
        );
};
