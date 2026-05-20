import { ProcessorEvent } from '@kbn/observability-plugin/common';
import type { EntityType } from '../../../../common/correlations/types';
import { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
/** Resolve processor event from correlations API entity type (no chart-type dependency). */
export declare function getEventTypeFromEntityType(entityType: EntityType): ProcessorEvent;
export declare function getEventType(chartType: LatencyDistributionChartType, searchMetrics: boolean): ProcessorEvent;
