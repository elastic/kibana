import type { CoreStart } from '@kbn/core/public';
export interface UseSuggestionsResult {
    terms: string[];
    isLoading: boolean;
    onSearchChange: (value: string) => void;
    fetchAllTerms: () => void;
}
interface UseSuggestionsParams {
    core: CoreStart;
    fieldName: string;
    start: string;
    end: string;
    serviceName?: string;
    fetchOnMount?: boolean;
}
export declare function useSuggestions({ core, fieldName, start, end, serviceName, fetchOnMount, }: UseSuggestionsParams): UseSuggestionsResult;
export {};
