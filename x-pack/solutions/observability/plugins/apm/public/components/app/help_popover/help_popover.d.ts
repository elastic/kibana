import type { ReactNode } from 'react';
import React from 'react';
import type { EuiLinkButtonProps, EuiPopoverProps } from '@elastic/eui';
export declare function HelpPopoverButton({ buttonTextEnabled, onClick, }: {
    buttonTextEnabled?: boolean;
    onClick: EuiLinkButtonProps['onClick'];
}): React.JSX.Element;
export declare function HelpPopover({ anchorPosition, button, children, closePopover, isOpen, title, }: {
    anchorPosition?: EuiPopoverProps['anchorPosition'];
    button: EuiPopoverProps['button'];
    children: ReactNode;
    closePopover: EuiPopoverProps['closePopover'];
    isOpen: EuiPopoverProps['isOpen'];
    title?: string;
}): React.JSX.Element;
