import React from 'react';
interface ServiceHeaderBadgesProps {
    serviceName: string;
    environment: string;
    start: string;
    end: string;
    onSloClick: () => void;
    alertsTabHref: string;
}
export declare function ServiceHeaderBadges({ serviceName, environment, start, end, onSloClick, alertsTabHref, }: ServiceHeaderBadgesProps): React.JSX.Element | null;
export {};
