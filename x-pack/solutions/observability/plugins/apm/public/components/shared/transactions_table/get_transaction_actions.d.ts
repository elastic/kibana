import type { ApmRuleType } from '@kbn/rule-data-utils';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import type { ApmIndicatorType } from '../../../../common/slo_indicator_types';
import type { ServiceTransactionGroupItem } from './get_columns';
import type { TableActions } from '../managed_table';
interface UseTransactionActionsParams {
    kuery: string;
    serviceName: string;
    environment: string;
    rangeFrom: string;
    rangeTo: string;
    indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
    openAlertFlyout: (ruleType: ApmRuleType, transactionName: string) => void;
    openSloFlyout: (indicatorType: ApmIndicatorType, transactionName: string) => void;
}
export declare function useTransactionActions({ kuery, serviceName, environment, rangeFrom, rangeTo, indexSettings, openAlertFlyout, openSloFlyout, }: UseTransactionActionsParams): TableActions<ServiceTransactionGroupItem>;
export {};
