import type { CoreStart, KibanaRequest } from '@kbn/core/server';
export declare function isSuperuser({ coreStart, request, }: {
    coreStart: CoreStart;
    request: KibanaRequest;
}): boolean | undefined;
