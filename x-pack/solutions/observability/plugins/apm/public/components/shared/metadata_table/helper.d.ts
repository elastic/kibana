import type { SectionDescriptor } from './types';
export declare const getSectionsFromFields: (fields: Record<string, any>) => SectionDescriptor[];
export declare const filterSectionsByTerm: (sections: SectionDescriptor[], searchTerm: string) => SectionDescriptor[];
