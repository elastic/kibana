import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import type { MapTypes } from '../../../../../../common/mobile/constants';
import type { StyleColorParams } from './map_layers/style_color_params';
declare function EmbeddedMapComponent({ selectedMap, start, end, kuery, filters, dataView, styleColors, }: {
    selectedMap: MapTypes;
    start: string;
    end: string;
    kuery?: string;
    filters: Filter[];
    dataView?: DataView;
    styleColors?: StyleColorParams;
}): React.JSX.Element;
declare namespace EmbeddedMapComponent {
    var displayName: string;
}
export declare const EmbeddedMap: React.MemoExoticComponent<typeof EmbeddedMapComponent>;
export {};
