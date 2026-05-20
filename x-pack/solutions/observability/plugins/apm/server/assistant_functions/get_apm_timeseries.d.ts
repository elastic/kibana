import type { FromSchema } from 'json-schema-to-ts';
import type { FunctionRegistrationParameters } from '.';
import type { ApmTimeseries } from '../routes/assistant_functions/get_apm_timeseries';
declare const parameters: {
    readonly type: "object";
    readonly properties: {
        readonly start: {
            readonly type: "string";
            readonly description: "The start of the time range, in Elasticsearch date math, like `now-24h`.";
        };
        readonly end: {
            readonly type: "string";
            readonly description: "The end of the time range, in Elasticsearch date math, like `now`.";
        };
        readonly stats: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly timeseries: {
                        readonly description: "The metric to be displayed";
                        readonly oneOf: readonly [{
                            readonly type: "object";
                            readonly properties: {
                                readonly name: {
                                    readonly type: "string";
                                    readonly enum: readonly ["transaction_throughput", "transaction_failure_rate"];
                                };
                                readonly 'transaction.type': {
                                    readonly type: "string";
                                    readonly description: "The transaction type";
                                };
                            };
                            readonly required: readonly ["name"];
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly name: {
                                    readonly type: "string";
                                    readonly enum: readonly ["exit_span_throughput", "exit_span_failure_rate", "exit_span_latency"];
                                };
                                readonly 'span.destination.service.resource': {
                                    readonly type: "string";
                                    readonly description: "The name of the downstream dependency for the service";
                                };
                            };
                            readonly required: readonly ["name"];
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly name: {
                                    readonly type: "string";
                                    readonly const: "error_event_rate";
                                };
                            };
                            readonly required: readonly ["name"];
                        }, {
                            readonly type: "object";
                            readonly properties: {
                                readonly name: {
                                    readonly type: "string";
                                    readonly const: "transaction_latency";
                                };
                                readonly 'transaction.type': {
                                    readonly type: "string";
                                };
                                readonly function: {
                                    readonly type: "string";
                                    readonly enum: readonly ["avg", "p95", "p99"];
                                };
                            };
                            readonly required: readonly ["name", "function"];
                        }];
                    };
                    readonly 'service.name': {
                        readonly description: "The name of the service";
                        readonly type: "string";
                        readonly minLength: number;
                    };
                    readonly 'service.environment': {
                        readonly description: "The environment that the service is running in. If undefined, all environments will be included. Only use this if you have confirmed the environment that the service is running in.";
                    };
                    readonly filter: {
                        readonly type: "string";
                        readonly description: "a KQL query to filter the data by. If no filter should be applied, leave it empty.";
                    };
                    readonly title: {
                        readonly type: "string";
                        readonly description: "A unique, human readable, concise title for this specific group series.";
                    };
                    readonly offset: {
                        readonly type: "string";
                        readonly description: "The offset. Right: 15m. 8h. 1d. Wrong: -15m. -8h. -1d.";
                    };
                };
                readonly required: readonly ["service.name", "timeseries", "title"];
            };
        };
    };
    readonly required: readonly ["stats", "start", "end"];
};
export declare function registerGetApmTimeseriesFunction({ apmEventClient, registerFunction, }: FunctionRegistrationParameters): void;
export type GetApmTimeseriesFunctionArguments = FromSchema<typeof parameters>;
export interface GetApmTimeseriesFunctionResponse {
    content: Array<Omit<ApmTimeseries, 'data'>>;
    data: ApmTimeseries[];
}
export {};
