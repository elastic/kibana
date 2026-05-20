import React from 'react';
interface HttpInfoProps {
    method?: string;
    status?: number;
    url?: string;
}
export declare function HttpInfoSummaryItem({ status, method, url }: HttpInfoProps): React.JSX.Element | null;
export {};
