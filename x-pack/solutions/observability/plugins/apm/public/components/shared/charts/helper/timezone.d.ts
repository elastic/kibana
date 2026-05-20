import type { IUiSettingsClient } from '@kbn/core/public';
interface Params {
    domain: [number, number];
    totalTicks: number;
    width: number;
}
export declare const getTimeTicksTZ: ({ domain, totalTicks, width }: Params) => Date[];
export declare const getDomainTZ: (min: number, max: number) => [number, number];
export declare function getTimeZone(uiSettings?: IUiSettingsClient): string;
export {};
