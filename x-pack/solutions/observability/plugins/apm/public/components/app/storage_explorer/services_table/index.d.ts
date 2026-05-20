import React from 'react';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
interface Props {
    summaryStatsData?: APIReturnType<'GET /internal/apm/storage_explorer_summary_stats'>;
    loadingSummaryStats: boolean;
}
export declare function ServicesTable({ summaryStatsData, loadingSummaryStats }: Props): React.JSX.Element;
export {};
