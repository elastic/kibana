import React from 'react';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
export declare function CustomLinkFlyout({ transaction, isOpen, onClose, }: {
    transaction?: Transaction;
    isOpen: boolean;
    onClose: () => void;
}): React.JSX.Element;
