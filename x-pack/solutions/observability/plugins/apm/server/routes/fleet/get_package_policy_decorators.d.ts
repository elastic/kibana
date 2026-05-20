import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import type { AgentConfiguration } from '../../../common/agent_configuration/configuration_types';
import type { ArtifactSourceMap } from './source_maps';
export declare const AGENT_CONFIG_PATH = "inputs[0].config['apm-server'].value.agent_config";
export declare const AGENT_CONFIG_API_KEY_PATH = "inputs[0].config['apm-server'].value.agent.config.elasticsearch.api_key";
export declare const SOURCE_MAP_API_KEY_PATH = "inputs[0].config['apm-server'].value.rum.source_mapping.elasticsearch.api_key";
export declare const SOURCE_MAP_PATH = "inputs[0].config['apm-server'].value.rum.source_mapping.metadata";
export declare function getPackagePolicyWithAgentConfigurations(packagePolicy: NewPackagePolicy, agentConfigurations: AgentConfiguration[]): NewPackagePolicy;
export declare function getPackagePolicyWithSourceMap({ packagePolicy, artifacts, }: {
    packagePolicy: NewPackagePolicy;
    artifacts: ArtifactSourceMap[];
}): NewPackagePolicy;
export declare function getPackagePolicyWithApiKeys({ packagePolicy, agentConfigApiKey, sourceMapApiKey, }: {
    packagePolicy: NewPackagePolicy;
    agentConfigApiKey: string;
    sourceMapApiKey: string;
}): NewPackagePolicy;
export declare function policyHasApiKey(packagePolicy: NewPackagePolicy): boolean;
