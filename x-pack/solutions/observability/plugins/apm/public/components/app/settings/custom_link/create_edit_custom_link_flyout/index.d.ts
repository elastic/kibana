import React from 'react';
import type { Filter } from '../../../../../../common/custom_link/custom_link_types';
interface Props {
    onClose: () => void;
    onSave: () => void;
    onDelete: () => void;
    defaults?: {
        url?: string;
        label?: string;
        filters?: Filter[];
    };
    customLinkId?: string;
}
export declare function CreateEditCustomLinkFlyout({ onClose, onSave, onDelete, defaults, customLinkId, }: Props): React.JSX.Element;
export {};
