import type { AlertsLocatorParams } from '@kbn/observability-plugin/common';
import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { IBasePath, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { AlertingServerSetup, IRuleTypeAlerts } from '@kbn/alerting-plugin/server';
import type { ObservabilityPluginSetup } from '@kbn/observability-plugin/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import type { ObservabilityApmAlert } from '@kbn/alerts-as-data-utils';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { APMConfig } from '../..';
export declare const APM_RULE_TYPE_ALERT_CONTEXT = "observability.apm";
export declare const apmRuleTypeAlertFieldMap: {
    "anomaly.detector_type": {
        type: string;
        required: boolean;
    };
    "service.name": {
        type: string;
        required: boolean;
    };
    "service.environment": {
        type: string;
        required: boolean;
    };
    "host.name": {
        type: string;
        required: boolean;
    };
    "container.id": {
        type: string;
        required: boolean;
    };
    "transaction.type": {
        type: string;
        required: boolean;
    };
    "transaction.name": {
        type: string;
        required: boolean;
    };
    "error.grouping_key": {
        type: string;
        required: boolean;
    };
    "error.grouping_name": {
        type: string;
        required: boolean;
    };
    "processor.event": {
        type: string;
        required: boolean;
    };
    "agent.name": {
        type: string;
        required: boolean;
    };
    "service.language.name": {
        type: string;
        required: boolean;
    };
    labels: {
        type: string;
        dynamic: boolean;
        required: boolean;
    };
    "kibana.alert.evaluation.threshold": {
        readonly type: "scaled_float";
        readonly scaling_factor: 100;
        readonly required: false;
    };
    "kibana.alert.evaluation.time_range": {
        readonly type: "date_range";
        readonly array: false;
        readonly required: false;
    };
    "kibana.alert.evaluation.value": {
        readonly type: "scaled_float";
        readonly scaling_factor: 100;
        readonly required: false;
    };
    "kibana.alert.context": {
        readonly type: "object";
        readonly array: false;
        readonly required: false;
    };
    "kibana.alert.evaluation.values": {
        readonly type: "scaled_float";
        readonly scaling_factor: 100;
        readonly required: false;
        readonly array: true;
    };
    "kibana.alert.grouping": {
        readonly type: "object";
        readonly dynamic: true;
        readonly array: false;
        readonly required: false;
    };
    "kibana.alert.group": {
        readonly type: "object";
        readonly array: true;
        readonly required: false;
    };
    "kibana.alert.group.field": {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
    "kibana.alert.group.value": {
        readonly type: "keyword";
        readonly array: true;
        readonly required: false;
    };
};
export declare const ApmRuleTypeAlertDefinition: IRuleTypeAlerts<ObservabilityApmAlert>;
export interface RegisterRuleDependencies {
    alerting: AlertingServerSetup;
    basePath: IBasePath;
    getApmIndices: (soClient: SavedObjectsClientContract) => Promise<APMIndices>;
    apmConfig: APMConfig;
    logger: Logger;
    ml?: MlPluginSetup;
    observability: ObservabilityPluginSetup;
    ruleDataClient: IRuleDataClient;
    alertsLocator?: LocatorPublic<AlertsLocatorParams>;
}
export declare function registerApmRuleTypes(dependencies: RegisterRuleDependencies): void;
