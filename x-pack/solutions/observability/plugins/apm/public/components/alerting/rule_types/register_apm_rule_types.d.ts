import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import { type ApmAlertingSetupDeps, type ApmCoreSetup } from '../utils/create_lazy_component_with_context';
export declare function registerApmRuleTypes(observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry, coreSetup: ApmCoreSetup, setupDeps?: ApmAlertingSetupDeps): void;
