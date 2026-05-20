import type { APMError } from '../../../../../typings/es_schemas/ui/apm_error';
export declare enum ErrorTabKey {
    LogStackTrace = "log_stacktrace",
    ExceptionStacktrace = "exception_stacktrace",
    Metadata = "metadata"
}
export interface ErrorTab {
    key: ErrorTabKey;
    label: string;
}
export declare const logStacktraceTab: ErrorTab;
export declare const exceptionStacktraceTab: ErrorTab;
export declare const metadataTab: ErrorTab;
export declare function getTabs(error: {
    error: {
        log?: APMError['error']['log'];
    };
}): ErrorTab[];
