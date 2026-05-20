import React from 'react';
import type { Chart } from '@elastic/charts';
import type { PointerEvent } from '@elastic/charts';
export declare function useChartPointerEventContext(): {
    chartRef: React.RefObject<Chart>;
    pointerEventTargetRef: React.MutableRefObject<EventTarget>;
    updatePointerEvent: (pointerEvent: PointerEvent) => void;
};
