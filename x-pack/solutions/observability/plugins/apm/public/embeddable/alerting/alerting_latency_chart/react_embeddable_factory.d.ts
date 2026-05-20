import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { EmbeddableApmAlertingLatencyVizProps } from '../types';
import type { EmbeddableDeps } from '../../types';
export declare const getApmAlertingLatencyChartEmbeddableFactory: (deps: EmbeddableDeps) => EmbeddablePublicDefinition<EmbeddableApmAlertingLatencyVizProps, DefaultEmbeddableApi<EmbeddableApmAlertingLatencyVizProps>>;
