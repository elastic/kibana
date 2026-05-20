import type { FunctionRegistrationParameters } from '.';
import type { RandomSampler } from '../lib/helpers/get_random_sampler';
interface DownstreamDependenciesFunctionRegistrationParams extends FunctionRegistrationParameters {
    randomSampler: RandomSampler;
}
export declare function registerGetApmDownstreamDependenciesFunction({ apmEventClient, registerFunction, randomSampler, }: DownstreamDependenciesFunctionRegistrationParams): void;
export {};
