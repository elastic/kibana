import React from 'react';
export declare enum Shape {
    circle = "circle",
    square = "square"
}
interface IndicatorProps {
    color: string;
    shape: Shape;
    withMargin: boolean;
}
export declare const Indicator: import("@emotion/styled").StyledComponent<{
    theme?: import("@emotion/react").Theme;
    as?: React.ElementType;
} & IndicatorProps, React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>, {}>;
interface Props {
    onClick?: any;
    text?: string;
    color?: string;
    disabled?: boolean;
    clickable?: boolean;
    shape?: Shape;
    indicator?: React.ReactNode;
}
export declare function Legend({ onClick, text, color, disabled, clickable, shape, indicator, ...rest }: Props): React.JSX.Element;
export {};
