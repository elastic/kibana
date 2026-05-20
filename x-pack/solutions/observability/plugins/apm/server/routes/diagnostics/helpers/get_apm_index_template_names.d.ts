import type { IndicesGetIndexTemplateIndexTemplateItem } from '@elastic/elasticsearch/lib/api/types';
export declare function getApmIndexTemplateNames(): Record<string, string[]>;
export declare function getApmIndexTemplates(existingIndexTemplates: IndicesGetIndexTemplateIndexTemplateItem[]): {
    name: string;
    exists: boolean;
    isNonStandard: boolean;
}[];
