import type { History } from 'history';
import type { FETCH_STATUS } from '../../../hooks/use_fetcher';
import type { replace as urlHelpersReplace } from '../../shared/links/url_helpers';
export declare function maybeRedirectToAvailableSpanSample({ spanFetchStatus, spanId, pageSize, page, replace, samples, history, }: {
    spanFetchStatus: FETCH_STATUS;
    spanId?: string;
    pageSize: number;
    page: number;
    replace: typeof urlHelpersReplace;
    history: History;
    samples: Array<{
        spanId: string;
        traceId: string;
        transactionId?: string;
    }>;
}): void;
