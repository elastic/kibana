import type { ApmRuleType } from '@kbn/rule-data-utils';
import type { ServiceListItem } from '../../../../../common/service_inventory';
import type { ApmIndicatorType } from '../../../../../common/slo_indicator_types';
import type { TableActions } from '../../../shared/managed_table';
import type { IndexType } from '../../../shared/links/discover_links/get_esql_query';
interface UseServiceActionsParams {
    openAlertFlyout: (ruleType: ApmRuleType, serviceName: string) => void;
    openSloFlyout: (indicatorType: ApmIndicatorType, serviceName: string) => void;
    getDiscoverHref: (item: ServiceListItem, indexType: IndexType) => string | undefined;
}
export declare function useServiceActions({ openAlertFlyout, openSloFlyout, getDiscoverHref, }: UseServiceActionsParams): TableActions<ServiceListItem>;
export {};
