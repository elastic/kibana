import React from 'react';
interface Props {
    properties: Array<{
        field: string;
        value: string[] | number[];
    }>;
}
export declare function Section({ properties }: Props): React.JSX.Element;
export {};
