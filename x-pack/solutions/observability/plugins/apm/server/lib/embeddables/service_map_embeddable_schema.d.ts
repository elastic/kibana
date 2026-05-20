import type { TypeOf } from '@kbn/config-schema';
import type { GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
export declare const serviceMapCustomStateSchema: import("@kbn/config-schema").ObjectType<{
    environment: import("@kbn/config-schema").Type<string>;
    kuery: import("@kbn/config-schema").Type<string | undefined>;
    service_name: import("@kbn/config-schema").Type<string | undefined>;
    service_group_id: import("@kbn/config-schema").Type<string | undefined>;
}>;
export type ServiceMapCustomState = TypeOf<typeof serviceMapCustomStateSchema>;
export declare const getServiceMapEmbeddableSchema: (_getDrilldownsSchema: GetDrilldownsSchemaFnType) => import("@kbn/config-schema").Type<Readonly<{
    title?: string | undefined;
    description?: string | undefined;
    time_range?: Readonly<{
        mode?: "absolute" | "relative" | undefined;
    } & {
        from: string;
        to: string;
    }> | undefined;
    kuery?: string | undefined;
    hide_title?: boolean | undefined;
    hide_border?: boolean | undefined;
    service_name?: string | undefined;
    service_group_id?: string | undefined;
} & {
    environment: string;
}>>;
export type ServiceMapEmbeddableState = TypeOf<ReturnType<typeof getServiceMapEmbeddableSchema>>;
