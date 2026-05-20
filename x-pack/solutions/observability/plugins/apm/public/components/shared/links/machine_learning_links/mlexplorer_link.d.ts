import type { ReactNode } from 'react';
import React from 'react';
interface Props {
    children?: ReactNode;
    jobId: string;
    external?: boolean;
}
export declare function MLExplorerLink({ jobId, external, children }: Props): React.JSX.Element;
export declare function useExplorerHref({ jobId }: {
    jobId: string;
}): string;
export {};
