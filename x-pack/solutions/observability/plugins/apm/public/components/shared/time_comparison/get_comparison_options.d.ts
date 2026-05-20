import type { Environment } from '../../../../common/environment_rt';
import type { AnomalyDetectionJobsContextValue } from '../../../context/anomaly_detection_jobs/anomaly_detection_jobs_context';
export declare enum TimeRangeComparisonEnum {
    WeekBefore = "week",
    DayBefore = "day",
    PeriodBefore = "period",
    ExpectedBounds = "expected_bounds"
}
export declare const isTimeComparison: (v: string | undefined) => boolean;
export declare const isExpectedBoundsComparison: (v: string | undefined) => v is TimeRangeComparisonEnum.ExpectedBounds;
export declare const dayAndWeekBeforeToOffset: {
    readonly day: "1d";
    readonly week: "1w";
};
export declare function isDefined<T>(argument: T | undefined | null): argument is T;
export declare function getComparisonOptions({ start, end, showSelectedBoundsOption, anomalyDetectionJobsStatus, anomalyDetectionJobsData, preferredEnvironment, }: {
    showSelectedBoundsOption?: boolean;
    anomalyDetectionJobsStatus?: AnomalyDetectionJobsContextValue['anomalyDetectionJobsStatus'];
    anomalyDetectionJobsData?: AnomalyDetectionJobsContextValue['anomalyDetectionJobsData'];
    preferredEnvironment?: Environment;
    start?: string;
    end?: string;
}): {
    value: string;
    text: string;
    disabled?: boolean;
}[];
