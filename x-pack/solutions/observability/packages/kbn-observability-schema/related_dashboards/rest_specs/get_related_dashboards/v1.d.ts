import { z } from '@kbn/zod/v4';
export declare const getRelatedDashboardsParamsSchema: z.ZodObject<{
    query: z.ZodObject<{
        alertId: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const getRelatedDashboardsResponseSchema: z.ZodObject<{
    suggestedDashboards: z.ZodArray<z.ZodObject<{
        matchedBy: z.ZodObject<{
            fields: z.ZodOptional<z.ZodArray<z.ZodString>>;
            index: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>;
        score: z.ZodNumber;
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    linkedDashboards: z.ZodArray<z.ZodObject<{
        matchedBy: z.ZodObject<{
            fields: z.ZodOptional<z.ZodArray<z.ZodString>>;
            index: z.ZodOptional<z.ZodArray<z.ZodString>>;
            linked: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>;
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type GetRelatedDashboardsResponse = z.output<typeof getRelatedDashboardsResponseSchema>;
