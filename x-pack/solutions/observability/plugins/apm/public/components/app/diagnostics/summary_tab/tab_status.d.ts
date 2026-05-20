import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
export declare function TabStatus({ isLoading, isOk, children, ...props }: {
    isLoading: boolean;
    isOk?: boolean;
    children: React.ReactNode;
} & React.ComponentProps<typeof EuiFlexItem>): React.JSX.Element;
