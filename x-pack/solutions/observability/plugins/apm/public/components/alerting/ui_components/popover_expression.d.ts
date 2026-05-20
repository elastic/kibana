import React from 'react';
type ExpressionColor = 'subdued' | 'primary' | 'success' | 'accent' | 'warning' | 'danger';
interface Props {
    title: string;
    value: React.ReactNode;
    children?: React.ReactNode;
    color?: ExpressionColor;
    dataTestSubj?: string;
}
export declare function PopoverExpression(props: Props): React.JSX.Element;
export {};
