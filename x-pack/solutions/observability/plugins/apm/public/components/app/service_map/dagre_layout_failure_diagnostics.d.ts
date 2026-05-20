export interface DagreLayoutFailureDiagnostics {
    error_name: string;
    /**
     * Truncated `Error.message` (length-capped only). Not redacted: we assume Dagre throws
     * library-internal strings; if another error were wrapped here, content could vary.
     */
    error_message: string;
    /**
     * Truncated, flattened stack head. Not redacted; may include chunk URLs/lines for debugging.
     */
    stack_head: string;
}
/**
 * Builds telemetry fields when Dagre.layout throws. Does not attach the service map graph.
 * Message and stack are taken from the caught value as-is (aside from truncation / whitespace
 * folding); they are not scrubbed for PII—call only with errors originating from Dagre layout.
 */
export declare function getDagreLayoutFailureDiagnostics(error: unknown): DagreLayoutFailureDiagnostics;
