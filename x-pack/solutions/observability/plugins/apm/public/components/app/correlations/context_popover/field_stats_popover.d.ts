import React from 'react';
import type { FieldStatsProps } from '@kbn/unified-field-list/src/components/field_stats';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { estypes } from '@elastic/elasticsearch';
export declare function kqlQuery(kql: string): estypes.QueryDslQueryContainer[];
export type OnAddFilter = ({ fieldName, fieldValue, include, }: {
    fieldName: string;
    fieldValue: string | number;
    include: boolean;
}) => void;
type FieldStatsPopoverContentProps = Omit<FieldStatsProps, 'dataViewOrDataViewId'> & {
    fieldName: string;
    fieldValue: string | number;
    dslQuery: object;
    dataView: DataView;
};
export declare function FieldStatsPopoverContent({ fieldName, fieldValue, services, field, dataView, dslQuery, filters, fromDate, toDate, onAddFilter, overrideFieldTopValueBar, }: FieldStatsPopoverContentProps): React.JSX.Element;
export declare function FieldStatsPopover({ fieldName, fieldValue, onAddFilter, }: {
    fieldName: string;
    fieldValue: string | number;
    onAddFilter: OnAddFilter;
}): React.JSX.Element | null;
export {};
