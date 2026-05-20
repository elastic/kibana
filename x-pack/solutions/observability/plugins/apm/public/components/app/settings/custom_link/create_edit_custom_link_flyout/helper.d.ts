import type { Filter, FilterKey } from '../../../../../../common/custom_link/custom_link_types';
import type { Transaction } from '../../../../../../typings/es_schemas/ui/transaction';
interface FilterSelectOption {
    value: 'DEFAULT' | FilterKey;
    text: string;
}
export declare const DEFAULT_OPTION: FilterSelectOption;
export declare const FILTER_SELECT_OPTIONS: FilterSelectOption[];
/**
 * Returns the options available, removing filters already added, but keeping the selected filter.
 *
 * @param filters
 * @param selectedKey
 */
export declare const getSelectOptions: (filters: Filter[], selectedKey: Filter["key"]) => FilterSelectOption[];
export declare const replaceTemplateVariables: (url: string, transaction?: Transaction) => {
    formattedUrl: string;
    error: string | undefined;
};
export declare const convertFiltersToQuery: (filters: Filter[]) => Record<string, string>;
export {};
