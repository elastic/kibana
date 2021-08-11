import {
	TelemetryUsageTelemetry,
	PayloadResponse
} from './types'

export const initialTelemetryUsageTelemetry: TelemetryUsageTelemetry = {
	cloud_transmission: {
		response_codes: [],
		docs_lost: 0,
		docs_transmitted: 0
	},
	queue_stats: {
		num_capacity_exceeded: 0,
		docs_lost: 0
	},
	payload_stats: {
		payloads: []
	}
}

export const updateTelemetryUsageTelemetryPayloads = (
	payload: PayloadResponse,
	telemetryUsage: TelemetryUsageTelemetry
): TelemetryUsageTelemetry => {
	return initialTelemetryUsageTelemetry
}

export const updateTelemetryUsageTelemetryQueueStats = (
	lostDocs: number,
	telemetryUsage: TelemetryUsageTelemetry
): TelemetryUsageTelemetry => {
	return initialTelemetryUsageTelemetry
}