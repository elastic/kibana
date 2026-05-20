export declare const useFetchParams: () => {
    serviceName: string;
    transactionName: string | undefined;
    transactionType: string | undefined;
    kuery: string;
    environment: string | import("io-ts").Branded<string, import("@kbn/io-ts-utils").NonEmptyStringBrand>;
    start: string;
    end: string;
};
