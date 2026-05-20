import type { Dispatch, PropsWithChildren, SetStateAction } from 'react';
import React from 'react';
import type { AlertsGroupingState, GroupModel } from '../types';
export declare const AlertsGroupingContext: React.Context<{
    groupingState: AlertsGroupingState;
    setGroupingState: Dispatch<SetStateAction<AlertsGroupingState>>;
}>;
export declare const AlertsGroupingContextProvider: ({ initialState, children, }: PropsWithChildren<{
    initialState?: AlertsGroupingState;
}>) => React.JSX.Element;
export declare const useAlertsGroupingState: (groupingId: string) => {
    grouping: GroupModel;
    updateGrouping: (groupModel: Partial<GroupModel> | null) => void;
};
