import React from 'react';
import type { ServiceMapSelection } from '../popover/popover_content';
interface DiagnosticFlyoutProps {
    onClose: () => void;
    isOpen: boolean;
    /** Selected node or edge from the service map */
    selection: ServiceMapSelection;
}
export declare function DiagnosticFlyout({ onClose, isOpen, selection }: DiagnosticFlyoutProps): React.JSX.Element | null;
export {};
