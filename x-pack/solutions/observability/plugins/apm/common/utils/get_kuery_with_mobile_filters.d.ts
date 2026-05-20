export declare function getKueryWithMobileFilters({ device, osVersion, appVersion, netConnectionType, kuery, }: {
    device: string | undefined;
    osVersion: string | undefined;
    appVersion: string | undefined;
    netConnectionType: string | undefined;
    kuery: string;
}): string;
export declare function getKueryWithMobileCrashFilter({ groupId, kuery, }: {
    groupId: string | undefined;
    kuery: string;
}): string;
export declare function getKueryWithMobileErrorFilter({ groupId, kuery, }: {
    groupId: string | undefined;
    kuery: string;
}): string;
