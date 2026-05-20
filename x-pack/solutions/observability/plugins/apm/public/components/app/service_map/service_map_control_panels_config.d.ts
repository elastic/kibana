export interface ServiceMapControlConfig {
    field_name: string;
    title: string;
    width: 'small' | 'medium' | 'large';
    grow: boolean;
}
/**
 * Control panel configuration for the service map Controls API dropdown filters.
 * The order of entries determines the visual order of the controls.
 */
export declare const SERVICE_MAP_CONTROLS_CONFIG: ServiceMapControlConfig[];
