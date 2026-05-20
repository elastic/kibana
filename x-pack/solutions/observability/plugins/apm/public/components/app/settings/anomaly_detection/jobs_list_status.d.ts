import React from 'react';
import { DATAFEED_STATE, JOB_STATE } from '@kbn/ml-plugin/common';
export declare function JobsListStatus({ jobId, jobState, datafeedState, version, }: {
    jobId: string;
    jobState?: JOB_STATE;
    datafeedState?: DATAFEED_STATE;
    version: number;
}): React.JSX.Element;
