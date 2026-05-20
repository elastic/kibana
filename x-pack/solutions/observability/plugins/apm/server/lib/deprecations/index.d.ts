import type { DeprecationsDetails, DocLinksServiceSetup } from '@kbn/core/server';
declare function deprecationError(title: string, error: Error, docLinks: DocLinksServiceSetup): DeprecationsDetails[];
declare function getErrorStatusCode(error: any): number | undefined;
declare function getDetailedErrorMessage(error: any): string;
export declare const deprecations: {
    deprecationError: typeof deprecationError;
    getDetailedErrorMessage: typeof getDetailedErrorMessage;
    getErrorStatusCode: typeof getErrorStatusCode;
};
export {};
