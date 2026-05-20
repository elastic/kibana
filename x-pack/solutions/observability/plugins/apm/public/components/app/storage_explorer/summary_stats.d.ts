import React from 'react';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
interface Props {
    data?: APIReturnType<'GET /internal/apm/storage_explorer_summary_stats'>;
    loading: boolean;
    hasData: boolean;
}
export declare function SummaryStats({ data, loading, hasData }: Props): React.JSX.Element;
export {};
