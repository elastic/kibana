import React from 'react';
import type { PopoverItem } from '.';
import type { FETCH_STATUS } from '../../../hooks/use_fetcher';
interface IconPopoverProps {
    title: string;
    children: React.ReactChild;
    onClick: () => void;
    onClose: () => void;
    detailsFetchStatus: FETCH_STATUS;
    isOpen: boolean;
    icon: PopoverItem['icon'];
}
export declare function IconPopover({ icon, title, children, onClick, onClose, detailsFetchStatus, isOpen, }: IconPopoverProps): React.JSX.Element | null;
export {};
