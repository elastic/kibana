export declare function useInstanceDetailsFetcher({ serviceName, serviceNodeName, }: {
    serviceName: string;
    serviceNodeName: string;
}): {
    data: import("../../../../../server/routes/services/get_service_instance_metadata_details").ServiceInstanceMetadataDetailsResponse | (import("../../../../../server/routes/services/get_service_instance_metadata_details").ServiceInstanceMetadataDetailsResponse & {
        kubernetes: import("@kbn/apm-types").Kubernetes;
    }) | undefined;
    status: import("../../../../hooks/use_fetcher").FETCH_STATUS;
};
