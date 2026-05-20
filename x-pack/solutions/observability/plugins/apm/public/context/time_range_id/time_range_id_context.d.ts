import React from 'react';
export declare const TimeRangeIdContext: React.Context<{
    incrementTimeRangeId: () => void;
    timeRangeId: number;
}>;
export declare function TimeRangeIdContextProvider({ children }: {
    children: React.ReactNode;
}): React.JSX.Element;
