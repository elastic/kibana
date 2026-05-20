import React from 'react';
import type { SectionDescriptor } from './types';
interface Props {
    sections: SectionDescriptor[];
    isLoading: boolean;
}
export declare function MetadataTable({ sections, isLoading }: Props): React.JSX.Element;
export {};
