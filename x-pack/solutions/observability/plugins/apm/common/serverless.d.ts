export { ServerlessType } from '@kbn/apm-types';
import type { ServerlessType } from '@kbn/apm-types';
export declare function getServerlessFunctionNameFromId(serverlessId: string): string;
export declare function getServerlessTypeFromCloudData(cloudProvider?: string, cloudServiceName?: string): ServerlessType | undefined;
