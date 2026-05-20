import React from 'react';
export interface WithDiagnoseButtonProps {
    showDiagnoseButton: boolean;
    onDiagnoseClick?: () => void;
}
/** P must include the diagnose props (optional) so they can be destructured and passed through. */
export declare const withDiagnoseButton: <P extends Partial<WithDiagnoseButtonProps>>(WrappedComponent: React.ComponentType<P>) => React.ComponentType<P>;
