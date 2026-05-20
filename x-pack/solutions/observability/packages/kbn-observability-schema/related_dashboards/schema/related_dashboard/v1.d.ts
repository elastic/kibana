import { z } from '@kbn/zod/v4';
export declare const linkedDashboardSchema: z.ZodObject<{
    matchedBy: z.ZodObject<{
        fields: z.ZodOptional<z.ZodArray<z.ZodString>>;
        index: z.ZodOptional<z.ZodArray<z.ZodString>>;
        linked: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>;
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const suggestedDashboardSchema: z.ZodObject<{
    matchedBy: z.ZodObject<{
        fields: z.ZodOptional<z.ZodArray<z.ZodString>>;
        index: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
    score: z.ZodNumber;
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type LinkedDashboard = z.output<typeof linkedDashboardSchema>;
export type SuggestedDashboard = z.output<typeof suggestedDashboardSchema>;
export type RelatedDashboard = LinkedDashboard | SuggestedDashboard;
