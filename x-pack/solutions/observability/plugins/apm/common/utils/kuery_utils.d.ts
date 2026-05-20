type Separator = 'OR' | 'AND';
export declare const toKueryFilterFormat: (key: string, values: string[], separator?: Separator) => string;
export declare const mergeKueries: (filters: string[], separator?: Separator) => string;
export {};
