import * as t from 'io-ts';
import type { TimePickerTimeDefaults } from '../components/shared/date_picker/typings';
export declare const APMLocatorPayloadValidator: t.UnionC<[t.TypeC<{
    serviceName: t.UndefinedC;
}>, t.IntersectionC<[t.TypeC<{
    serviceName: t.StringC;
}>, t.TypeC<{
    dashboardId: t.StringC;
}>, t.TypeC<{
    query: t.TypeC<{
        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
    }>;
}>]>, t.IntersectionC<[t.TypeC<{
    serviceName: t.StringC;
}>, t.PartialC<{
    dashboardId: t.UndefinedC;
}>, t.PartialC<{
    serviceOverviewTab: t.KeyofC<{
        traces: null;
        metrics: null;
        logs: null;
        errors: null;
        transactions: null;
    }>;
    errorGroupId: t.StringC;
}>, t.TypeC<{
    query: t.IntersectionC<[t.TypeC<{
        environment: t.UnionC<[t.LiteralC<"ENVIRONMENT_NOT_DEFINED">, t.LiteralC<"ENVIRONMENT_ALL">, t.StringC, t.BrandC<t.StringC, import("@kbn/io-ts-utils").NonEmptyStringBrand>]>;
    }>, t.PartialC<{
        kuery: t.StringC;
        rangeFrom: t.StringC;
        rangeTo: t.StringC;
    }>]>;
}>]>]>;
export type APMLocatorPayload = t.TypeOf<typeof APMLocatorPayloadValidator>;
export declare function getPathForServiceDetail(payload: APMLocatorPayload, { from, to, isComparisonEnabledByDefault, defaultEnvironment, }: TimePickerTimeDefaults & {
    isComparisonEnabledByDefault: boolean;
    defaultEnvironment: string;
}): string;
