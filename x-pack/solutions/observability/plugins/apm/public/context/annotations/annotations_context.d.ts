import React from 'react';
import type { Annotation } from '../../../common/annotations';
export declare const AnnotationsContext: React.Context<{
    annotations: Annotation[];
}>;
export declare function AnnotationsContextProvider({ children, serviceName, environment, start, end, }: {
    children: React.ReactNode;
    serviceName: string;
    environment: string;
    start: string;
    end: string;
}): React.JSX.Element;
