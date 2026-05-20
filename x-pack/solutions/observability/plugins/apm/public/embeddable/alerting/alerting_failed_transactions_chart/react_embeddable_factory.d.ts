import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { EmbeddablePublicDefinition } from '@kbn/embeddable-plugin/public';
import type { EmbeddableApmAlertingVizProps } from '../types';
import type { EmbeddableDeps } from '../../types';
export declare const getApmAlertingFailedTransactionsChartEmbeddableFactory: (deps: EmbeddableDeps) => EmbeddablePublicDefinition<EmbeddableApmAlertingVizProps, DefaultEmbeddableApi<EmbeddableApmAlertingVizProps>>;
