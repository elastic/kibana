import type { VectorStyleDescriptor } from '@kbn/maps-plugin/common';
import type { StyleColorParams } from './style_color_params';
export declare enum PalleteColors {
    BluetoRed = "Blue to Red",
    YellowtoRed = "Yellow to Red"
}
export declare function getLayerStyle(fieldName: string, color: PalleteColors, styleColors: StyleColorParams): VectorStyleDescriptor;
