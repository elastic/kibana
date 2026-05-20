import * as t from 'io-ts';
export interface CustomLinkES {
    id?: string;
    '@timestamp'?: number;
    label: string;
    url: string;
    'service.name'?: string[];
    'service.environment'?: string[];
    'transaction.name'?: string[];
    'transaction.type'?: string[];
}
export declare const filterOptionsRt: t.PartialC<{
    'service.name': t.StringC;
    'service.environment': t.StringC;
    'transaction.name': t.StringC;
    'transaction.type': t.StringC;
}>;
export declare const payloadRt: t.IntersectionC<[t.TypeC<{
    label: t.StringC;
    url: t.StringC;
}>, t.PartialC<{
    id: t.StringC;
    filters: t.ArrayC<t.TypeC<{
        key: t.UnionC<[t.LiteralC<"">, t.KeyofC<{
            'service.name': t.StringC;
            'service.environment': t.StringC;
            'transaction.name': t.StringC;
            'transaction.type': t.StringC;
        }>]>;
        value: t.StringC;
    }>>;
}>]>;
