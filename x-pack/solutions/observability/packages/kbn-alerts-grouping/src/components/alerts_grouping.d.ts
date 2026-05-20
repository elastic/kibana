import React from 'react';
import type { AlertsGroupingProps, BaseAlertsGroupAggregations } from '../types';
/**
 * A coordinator component to show multiple alert tables grouped by one or more fields
 *
 * @example Basic grouping
 * ```ts
 * const {
 *   notifications,
 *   dataViews,
 *   http,
 * } = useKibana().services;
 *
 *
 * return (
 *   <AlertsGrouping<YourAggregationsType>
 *     ruleTypeIds={[...]}
 *     globalQuery={{ query: ..., language: 'kql' }}
 *     globalFilters={...}
 *     from={...}
 *     to={...}
 *     groupingId={...}
 *     defaultGroupingOptions={...}
 *     getAggregationsByGroupingField={getAggregationsByGroupingField}
 *     renderGroupPanel={renderGroupPanel}
 *     getGroupStats={getStats}
 *     services={{
 *       notifications,
 *       dataViews,
 *       http,
 *     }}
 *   >
 *     {(groupingFilters) => {
 *       const query = buildEsQuery({
 *         filters: groupingFilters,
 *       });
 *       return (
 *         <AlertsTable
 *           query={query}
 *           ...
 *         />
 *       );
 *     }}
 *   </AlertsGrouping>
 * );
 * ```
 *
 * To define your aggregations result type, extend the `BaseAlertsGroupAggregations` type:
 *
 * ```ts
 * import { BaseAlertsGroupAggregations } from '@kbn/alerts-grouping';
 *
 * interface YourAggregationsType extends BaseAlertsGroupAggregations {
 *   // Your custom aggregations here
 * }
 * ```
 *
 * Check {@link useGetAlertsGroupAggregationsQuery} for more info on alerts aggregations.
 */
export declare const AlertsGrouping: <T extends BaseAlertsGroupAggregations>(props: AlertsGroupingProps<T>) => React.JSX.Element;
