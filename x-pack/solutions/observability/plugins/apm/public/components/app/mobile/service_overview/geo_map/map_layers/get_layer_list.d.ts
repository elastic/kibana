import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { LayerDescriptor } from '@kbn/maps-plugin/common';
import type { StyleColorParams } from './style_color_params';
import { MapTypes } from '../../../../../../../common/mobile/constants';
export declare function getLayerList({ selectedMap, maps, dataViewId, styleColors, }: {
    selectedMap: MapTypes;
    maps: MapsStartApi | undefined;
    dataViewId: string;
    styleColors: StyleColorParams;
}): LayerDescriptor[];
