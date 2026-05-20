import type { EntityType } from '../../../../common/correlations/types';
import type { LatencyDistributionChartType } from '../../../../common/latency_distribution_chart_types';
/** Resolve duration field from correlations API entity type (no chart-type dependency). */
export declare function getDurationFieldFromEntityType(entityType: EntityType, isOtel?: boolean): string;
export declare function getDurationField(chartType: LatencyDistributionChartType, searchMetrics: boolean, isOtel: boolean): "duration" | "transaction.duration.us" | "span.duration.us" | "transaction.duration.histogram";
