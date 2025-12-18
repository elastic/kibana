import React from 'react';
import type { AlertStatus } from '@kbn/rule-data-utils';
interface AlertStatusIndicatorProps {
    alertStatus: AlertStatus;
    textSize?: 'xs' | 's' | 'm' | 'inherit';
}
export declare function AlertStatusIndicator({ alertStatus, textSize }: AlertStatusIndicatorProps): React.JSX.Element;
export {};
