import type { LayerDescriptor as BaseLayerDescriptor } from '@kbn/maps-plugin/common';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import type { StyleColorParams } from './style_color_params';
export declare function getSessionMapLayerList(maps: MapsStartApi | undefined, dataViewId: string, styleColors: StyleColorParams): BaseLayerDescriptor[];
