import type { XYBrushEvent } from '@elastic/charts';
export declare function useSampleChartSelection(): {
    selectSampleFromChartSelection: (selection: XYBrushEvent) => void;
    clearChartSelection: () => void;
};
