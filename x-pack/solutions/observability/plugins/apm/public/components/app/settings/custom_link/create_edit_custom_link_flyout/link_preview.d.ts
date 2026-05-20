import React from 'react';
import type { Filter } from '../../../../../../common/custom_link/custom_link_types';
export interface LinkPreviewProps {
    label: string;
    url: string;
    filters: Filter[];
}
export declare function LinkPreview({ label, url, filters }: LinkPreviewProps): React.JSX.Element;
