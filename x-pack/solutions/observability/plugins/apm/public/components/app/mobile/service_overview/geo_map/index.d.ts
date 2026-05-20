import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
export declare function GeoMap({ start, end, kuery, filters, dataView, }: {
    start: string;
    end: string;
    kuery?: string;
    filters: Filter[];
    dataView?: DataView;
}): React.JSX.Element;
