import type { ReactElement } from 'react';
import type { TopAlert } from '@kbn/observability-plugin/public';
interface UseGetChartAlertAnnotationsProps {
    alert: TopAlert;
    dateFormat: string;
    showAnnotations: boolean;
    /** Include the threshold rect/line in the annotations. Defaults to `showAnnotations`. */
    showThresholdAnnotation?: boolean;
    customAlertEvaluationThreshold?: number;
    normalizeThreshold?: (value: number) => number;
}
export declare const useGetChartAlertAnnotations: ({ alert, dateFormat, showAnnotations, showThresholdAnnotation, customAlertEvaluationThreshold, normalizeThreshold, }: UseGetChartAlertAnnotationsProps) => ReactElement[] | undefined;
export {};
