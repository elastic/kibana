import type { CoreStart, KibanaRequest } from '@kbn/core/server';
export type RandomSampler = Awaited<ReturnType<typeof getRandomSampler>>;
export declare function getRandomSamplerSeed(coreStart: CoreStart, request: KibanaRequest): number;
export declare function getRandomSampler({ coreStart, request, probability, }: {
    coreStart: CoreStart;
    request: KibanaRequest;
    probability: number;
}): {
    probability: number;
    seed: number;
};
