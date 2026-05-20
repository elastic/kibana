import type { Environment } from '../../common/environment_rt';
export declare function useEnvironmentsFetcher({ serviceName, start, end, }: {
    serviceName?: string;
    start?: string;
    end?: string;
}): {
    environments: Environment[];
    status: import("./use_fetcher").FETCH_STATUS;
};
