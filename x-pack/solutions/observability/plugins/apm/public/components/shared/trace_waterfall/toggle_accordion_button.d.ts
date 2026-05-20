import React from 'react';
export declare const TOGGLE_BUTTON_WIDTH = 20;
interface Props {
    isOpen: boolean;
    childrenCount: number;
    onClick: () => void;
}
export declare function ToggleAccordionButton({ isOpen, childrenCount, onClick }: Props): React.JSX.Element;
export {};
