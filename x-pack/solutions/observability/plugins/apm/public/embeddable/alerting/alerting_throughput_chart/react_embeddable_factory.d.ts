import type { DefaultEmbeddableApi, EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { EmbeddableDeps } from '../../types';
import type { EmbeddableApmAlertingVizProps } from '../types';
export declare const getApmAlertingThroughputChartEmbeddableFactory: (deps: EmbeddableDeps) => EmbeddablePublicDefinition<EmbeddableApmAlertingVizProps, DefaultEmbeddableApi<EmbeddableApmAlertingVizProps>>;
