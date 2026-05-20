import type { ReactChild } from 'react';
import React from 'react';
import type { ContainerType } from '../../../../common/service_metadata';
interface Props {
    serviceName: string;
    environment: string;
    start: string;
    end: string;
}
export declare function getContainerIcon(container?: ContainerType): "logoDocker" | "logoKubernetes" | undefined;
type Icons = 'service' | 'opentelemetry' | 'container' | 'serverless' | 'cloud' | 'alerts';
export interface PopoverItem {
    key: Icons;
    icon: {
        type?: string;
        size?: 's' | 'm' | 'l';
    };
    isVisible: boolean;
    title: string;
    component: ReactChild;
}
export declare function ServiceIcons({ start, end, serviceName, environment }: Props): React.JSX.Element;
export {};
