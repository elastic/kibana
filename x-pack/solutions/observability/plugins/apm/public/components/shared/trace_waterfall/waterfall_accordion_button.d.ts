import React from 'react';
export interface WaterfallAccordionButtonProps {
    isOpen: boolean;
    onClick: () => void;
}
export declare function WaterfallAccordionButton({ isOpen, onClick }: WaterfallAccordionButtonProps): React.JSX.Element;
