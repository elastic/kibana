import type { TransactionDetailRedirectInfo } from '@kbn/apm-types';
export declare const getRedirectToTransactionDetailPageUrl: ({ transaction, rangeFrom, rangeTo, waterfallItemId, }: {
    transaction: TransactionDetailRedirectInfo;
    rangeFrom?: string;
    rangeTo?: string;
    waterfallItemId?: string;
}) => string;
