import type { APIResponseType } from '.';
export type PolicyOption = ReturnType<typeof getPolicyOptions>[0];
export declare function getPolicyOptions({ isCloudEnabled, data, }: {
    isCloudEnabled: boolean;
    data: APIResponseType;
}): {
    key: string;
    type: string;
    label: string;
    apmServerUrl: any;
    secretToken: any;
    isVisible: boolean;
    isSelected: boolean;
}[];
