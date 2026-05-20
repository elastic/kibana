import type { z } from '@kbn/zod/v4';
export declare const SERVICE_MAP_ATTACHMENT_TYPE: "observability.service-map";
export declare const serviceMapAttachmentDataSchema: z.ZodObject<{
    connections: z.ZodArray<z.ZodObject<{
        source: z.ZodUnion<readonly [z.ZodObject<{
            'service.name': z.ZodString;
            'agent.name': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            'span.destination.service.resource': z.ZodString;
            'span.type': z.ZodString;
            'span.subtype': z.ZodString;
        }, z.core.$strip>]>;
        target: z.ZodUnion<readonly [z.ZodObject<{
            'service.name': z.ZodString;
            'agent.name': z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodObject<{
            'span.destination.service.resource': z.ZodString;
            'span.type': z.ZodString;
            'span.subtype': z.ZodString;
        }, z.core.$strip>]>;
        metrics: z.ZodOptional<z.ZodObject<{
            errorRate: z.ZodOptional<z.ZodNumber>;
            latencyMs: z.ZodOptional<z.ZodNumber>;
            throughputPerMin: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    serviceName: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ServiceMapAttachmentData = z.infer<typeof serviceMapAttachmentDataSchema>;
