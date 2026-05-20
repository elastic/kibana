import React from 'react';
import type { ServiceGroupsSortType } from '.';
interface Props {
    type: ServiceGroupsSortType;
    onChange: (type: ServiceGroupsSortType) => void;
}
export declare function Sort({ type, onChange }: Props): React.JSX.Element;
export {};
