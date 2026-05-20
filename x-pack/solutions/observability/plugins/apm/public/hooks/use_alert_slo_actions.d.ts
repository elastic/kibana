import { type SloListLocatorParams } from '@kbn/deeplinks-observability';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import type { ApmIndicatorType } from '../../common/slo_indicator_types';
import type { TableActionGroup } from '../components/shared/managed_table';
export type ApmFlyoutState = {
    type: 'closed';
} | {
    type: 'alert';
    ruleType: ApmRuleType;
    transactionName?: string;
} | {
    type: 'slo';
    indicatorType: ApmIndicatorType;
    transactionName?: string;
};
interface GetAlertActionGroupParams<T> {
    onAlertClick: (item: T, ruleType: ApmRuleType) => void;
    showAnomalyRule?: boolean;
}
interface GetSloActionGroupParams<T> {
    onSloClick: (item: T, indicatorType: ApmIndicatorType) => void;
    getManageSlosHref?: (item: T) => string | undefined;
}
export declare function useAlertSloActions(): {
    getAlertActionGroup: <T>({ onAlertClick, showAnomalyRule, }: GetAlertActionGroupParams<T>) => TableActionGroup<T> | null;
    getSloActionGroup: <T>({ onSloClick, getManageSlosHref, }: GetSloActionGroupParams<T>) => TableActionGroup<T> | null;
    sloListLocator: import("@kbn/share-plugin/common").LocatorPublic<SloListLocatorParams> | undefined;
};
export {};
