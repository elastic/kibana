export declare function getShouldMatchOrNotExistFilter(keyValuePairs: Array<{
    field: string;
    value?: string;
}>): {
    bool: {
        should: ({
            bool: {
                filter: {
                    term: {
                        [x: string]: string | undefined;
                    };
                }[];
                must_not?: undefined;
            };
        } | {
            bool: {
                must_not: {
                    bool: {
                        filter: {
                            exists: {
                                field: string;
                            };
                        }[];
                    };
                };
                filter?: undefined;
            };
        })[];
        minimum_should_match: number;
    };
}[];
