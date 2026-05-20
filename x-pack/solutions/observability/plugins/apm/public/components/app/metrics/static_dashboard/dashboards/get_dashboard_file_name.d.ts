import type { DashboardFileName } from './dashboard_catalog';
interface DashboardFileNamePartsProps {
    agentName: string;
    telemetrySdkName?: string;
    telemetrySdkLanguage?: string;
    runtimeVersion?: string;
}
export declare const parseMajorVersion: (version?: string) => number | undefined;
export declare const getDashboardFileName: ({ agentName, telemetrySdkName, telemetrySdkLanguage, runtimeVersion, }: DashboardFileNamePartsProps) => DashboardFileName | undefined;
export {};
