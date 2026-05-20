import type { SourceMap } from './route';
export declare function getEncodedContent(sourceMapContent: SourceMap): Promise<{
    contentEncoded: string;
    contentHash: string;
}>;
export declare function getSourceMapId({ serviceName, serviceVersion, bundleFilepath, }: {
    serviceName: string;
    serviceVersion: string;
    bundleFilepath: string;
}): string;
