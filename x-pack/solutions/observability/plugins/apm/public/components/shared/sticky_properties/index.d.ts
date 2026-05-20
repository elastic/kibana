import React from 'react';
export interface IStickyProperty {
    val: JSX.Element | string | Date;
    label: string;
    fieldName?: string;
    width?: 0 | string;
    truncated?: boolean;
}
export declare function StickyProperties({ stickyProperties }: {
    stickyProperties: IStickyProperty[];
}): React.JSX.Element;
