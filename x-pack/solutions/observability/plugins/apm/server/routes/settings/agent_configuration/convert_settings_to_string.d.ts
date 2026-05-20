import type { SearchHit } from '@kbn/es-types';
import type { AgentConfiguration } from '../../../../common/agent_configuration/configuration_types';
export declare function convertConfigSettingsToString(hit: SearchHit<AgentConfiguration>): SearchHit<AgentConfiguration>;
