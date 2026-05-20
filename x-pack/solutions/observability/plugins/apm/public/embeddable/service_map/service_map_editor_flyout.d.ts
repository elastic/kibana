import React from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { ServiceMapEmbeddableState } from '../../../server/lib/embeddables/service_map_embeddable_schema';
import type { EmbeddableDeps } from '../types';
export interface ServiceMapEditorFlyoutProps {
    onCancel: () => void;
    onSave: (state: ServiceMapEmbeddableState) => void;
    initialState?: ServiceMapEmbeddableState;
    ariaLabelledBy: string;
    deps: EmbeddableDeps;
    timeRange?: TimeRange;
}
export declare function ServiceMapEditorFlyout({ onCancel, onSave, initialState, ariaLabelledBy, deps, timeRange, }: ServiceMapEditorFlyoutProps): React.JSX.Element;
