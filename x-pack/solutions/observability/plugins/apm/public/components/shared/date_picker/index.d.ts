import React from 'react';
export declare function DatePicker({ rangeFrom, rangeTo, refreshPaused, refreshInterval, onTimeRangeRefresh, }: {
    rangeFrom?: string;
    rangeTo?: string;
    refreshPaused?: boolean;
    refreshInterval?: number;
    onTimeRangeRefresh: () => void;
}): React.JSX.Element;
