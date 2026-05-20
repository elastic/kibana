import React from 'react';
interface Props {
    dismissCallout: () => void;
    serviceName: string;
    environment: string;
}
export declare function SloCallout({ dismissCallout, serviceName, environment }: Props): React.JSX.Element;
export {};
