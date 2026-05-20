import type { IBasePath } from '@kbn/core/public';
export declare function getUpgradeAssistantHref(basePath: IBasePath): string;
export declare function useFleetCloudAgentPolicyHref(): string;
export declare function useUpgradeApmPackagePolicyHref(packagePolicyId?: string): string;
export declare function useObservabilityActiveAlertsHref(kuery: string): string;
