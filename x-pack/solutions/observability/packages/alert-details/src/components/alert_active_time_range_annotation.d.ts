import React from 'react';
interface Props {
    alertStart: number;
    alertEnd?: number;
    color: string;
    id: string;
}
export declare function AlertActiveTimeRangeAnnotation({ alertStart, alertEnd, color, id }: Props): React.JSX.Element;
export {};
