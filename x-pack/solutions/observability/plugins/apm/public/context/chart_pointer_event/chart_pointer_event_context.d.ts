import type { ReactNode } from 'react';
import React from 'react';
import type { PointerEvent } from '@elastic/charts';
export declare const UPDATE_POINTER_EVENT = "updatePointerEvent";
export declare const ChartPointerEventContext: React.Context<{
    pointerEventTargetRef: React.MutableRefObject<EventTarget>;
    updatePointerEvent: (pointerEvent: PointerEvent) => void;
} | null>;
export declare function ChartPointerEventContextProvider({ children }: {
    children: ReactNode;
}): React.JSX.Element;
