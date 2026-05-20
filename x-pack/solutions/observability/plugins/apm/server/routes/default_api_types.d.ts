import * as t from 'io-ts';
import type { BoolQuery } from '@kbn/es-query';
import { ApmDocumentType } from '../../common/document_type';
import { RollupInterval } from '../../common/rollup';
export { environmentRt } from '../../common/environment_rt';
export declare const rangeRt: t.TypeC<{
    start: t.Type<number, string, unknown>;
    end: t.Type<number, string, unknown>;
}>;
export declare const probabilityRt: t.TypeC<{
    probability: t.Type<number, number, unknown>;
}>;
export declare const kueryRt: t.TypeC<{
    kuery: t.StringC;
}>;
export declare const serviceTransactionDataSourceRt: t.TypeC<{
    documentType: t.UnionC<[t.LiteralC<ApmDocumentType.ServiceTransactionMetric>, t.LiteralC<ApmDocumentType.TransactionMetric>, t.LiteralC<ApmDocumentType.TransactionEvent>]>;
    rollupInterval: t.UnionC<[t.LiteralC<RollupInterval.OneMinute>, t.LiteralC<RollupInterval.TenMinutes>, t.LiteralC<RollupInterval.SixtyMinutes>, t.LiteralC<RollupInterval.None>]>;
}>;
export declare const transactionDataSourceRt: t.TypeC<{
    documentType: t.UnionC<[t.LiteralC<ApmDocumentType.TransactionMetric>, t.LiteralC<ApmDocumentType.TransactionEvent>]>;
    rollupInterval: t.UnionC<[t.LiteralC<RollupInterval.OneMinute>, t.LiteralC<RollupInterval.TenMinutes>, t.LiteralC<RollupInterval.SixtyMinutes>, t.LiteralC<RollupInterval.None>]>;
}>;
export declare const filtersRt: t.Type<BoolQuery, string, unknown>;
