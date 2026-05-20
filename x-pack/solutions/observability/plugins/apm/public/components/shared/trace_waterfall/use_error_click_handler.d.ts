import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import type { OnErrorClick } from './trace_waterfall_context';
/**
 * Hook that provides a callback for handling error clicks in the trace waterfall.
 * Navigates to the appropriate error page based on the agent type (mobile vs standard).
 */
export declare function useErrorClickHandler(traceItems: TraceItem[]): OnErrorClick;
