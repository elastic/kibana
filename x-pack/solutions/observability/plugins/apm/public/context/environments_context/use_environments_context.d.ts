export declare function useEnvironmentsContext(): {
    environment: import("@kbn/apm-types").Environment;
    environments: import("@kbn/apm-types").Environment[];
    status: import("../../hooks/use_fetcher").FETCH_STATUS;
    preferredEnvironment: import("@kbn/apm-types").Environment;
    serviceName?: string;
    rangeFrom?: string;
    rangeTo?: string;
};
