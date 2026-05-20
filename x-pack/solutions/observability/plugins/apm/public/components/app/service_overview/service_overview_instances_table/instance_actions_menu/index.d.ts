import React from 'react';
interface Props {
    serviceName: string;
    serviceNodeName: string;
    kuery: string;
    onClose: () => void;
}
export declare function InstanceActionsMenu({ serviceName, serviceNodeName, kuery, onClose }: Props): React.JSX.Element | null;
export {};
