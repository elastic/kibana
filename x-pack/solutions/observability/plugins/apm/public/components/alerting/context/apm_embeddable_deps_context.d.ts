import type { EmbeddableDeps } from '../../../embeddable/types';
/** APM `EmbeddableDeps` for components rendered outside the APM app shell. */
export declare const ApmEmbeddableDepsContext: import("react").Context<EmbeddableDeps | null>;
export declare function useApmEmbeddableDeps(): EmbeddableDeps | null;
