import React from 'react';
import type { ApmDataSourceWithSummary } from '../../../../common/data_source';
import type { ApmDocumentType } from '../../../../common/document_type';
interface Props {
    serviceName: string;
    start: string;
    end: string;
    environment: string;
    startIndex: number;
    endIndex: number;
    dataSource?: ApmDataSourceWithSummary<ApmDocumentType.TransactionMetric | ApmDocumentType.TransactionEvent>;
    kuery: string;
    rangeFrom: string;
    rangeTo: string;
}
export declare function ProfilingHostsTopNFunctions({ serviceName, start, end, environment, startIndex, endIndex, dataSource, kuery, rangeFrom, rangeTo, }: Props): React.JSX.Element;
export {};
