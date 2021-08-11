/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


/* 
* Info about Telemetry Trasmission to cloud 
*/
export interface ResponseCounts {
	response_code: number,
	count: number
}

export interface TelemetryTransmissionMetrics {
	response_codes: ResponseCounts[]
	docs_lost: number;
	docs_transmitted: number;
}

/*
* Info about Endpoint Alert Queue
*/
export interface TelemetryQueueStats {
	num_capacity_exceeded: number;
	docs_lost: number;
}

/*
* Info about telemetry payloads themelves
*/
export interface TelemetryPayload {
	type: string;
	num_events: number;
	min_size: number;
	max_size: number;
	response_codes: ResponseCounts[];
}

export interface TelemetryPayloadStats {
	payloads: TelemetryPayload[]
}

export interface TelemetryUsageTelemetry {
	cloud_transmission: TelemetryTransmissionMetrics;
	queue_stats: TelemetryQueueStats;
	payload_stats: TelemetryPayloadStats;
}