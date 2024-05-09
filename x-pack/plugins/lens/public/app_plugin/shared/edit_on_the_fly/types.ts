/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Observable } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import type { LensPluginStartDependencies } from '../../../plugin';
import type {
  DatasourceMap,
  VisualizationMap,
  FramePublicAPI,
  UserMessagesGetter,
} from '../../../types';
import type { LensEmbeddableOutput } from '../../../embeddable';
import type { LensInspector } from '../../../lens_inspector_service';
import type { Document } from '../../../persistence';

export interface FlyoutWrapperProps {
  children: JSX.Element;
  isInlineFlyoutVisible: boolean;
  isScrollable: boolean;
  displayFlyoutHeader?: boolean;
  language?: string;
  isNewPanel?: boolean;
  isSaveable?: boolean;
  onCancel?: () => void;
  onApply?: () => void;
  navigateToLensEditor?: () => void;
}

export interface EditConfigPanelProps {
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  /** The attributes of the Lens embeddable */
  attributes: TypedLensByValueInput['attributes'];
  /** Callback for updating the visualization and datasources state.*/
  updatePanelState: (
    datasourceState: unknown,
    visualizationState: unknown,
    visualizationType?: string
  ) => void;
  updateSuggestion?: (attrs: TypedLensByValueInput['attributes']) => void;
  /** Set the attributes state */
  setCurrentAttributes?: (attrs: TypedLensByValueInput['attributes']) => void;
  /** Lens visualizations can be either created from ESQL (textBased) or from dataviews (formBased) */
  datasourceId: 'formBased' | 'textBased';
  /** Embeddable output observable, useful for dashboard flyout  */
  output$?: Observable<LensEmbeddableOutput>;
  /** Contains the active data, necessary for some panel configuration such as coloring */
  lensAdapters?: LensInspector['adapters'];
  /** Optional callback called when updating the by reference embeddable */
  updateByRefInput?: (soId: string) => void;
  /** Callback for closing the edit flyout */
  closeFlyout?: () => void;
  /** Boolean used for adding a flyout wrapper */
  wrapInFlyout?: boolean;
  /** Optional parameter for panel identification
   * If not given, Lens generates a new one
   */
  panelId?: string;
  /** Optional parameter for saved object id
   * Should be given if the lens embeddable is a by reference one
   * (saved in the library)
   */
  savedObjectId?: string;
  /** Callback for saving the embeddable as a SO */
  saveByRef?: (attrs: Document) => void;
  /** Optional callback for navigation from the header of the flyout */
  navigateToLensEditor?: () => void;
  /** If set to true it displays a header on the flyout */
  displayFlyoutHeader?: boolean;
  /** If set to true the layout changes to accordion and the text based query (i.e. ES|QL) can be edited */
  canEditTextBasedQuery?: boolean;
  /** The flyout is used for adding a new panel by scratch */
  isNewPanel?: boolean;
  /** Handler for deleting the embeddable, used in case a user cancels a newly created chart */
  deletePanel?: () => void;
  /** If set to true the layout changes to accordion and the text based query (i.e. ES|QL) can be edited */
  hidesSuggestions?: boolean;
  /** Optional callback for apply flyout button */
  onApplyCb?: (input: TypedLensByValueInput['attributes']) => void;
  /** Optional callback for cancel flyout button */
  onCancelCb?: () => void;
  // in cases where the embeddable is not filtered by time
  // (e.g. through unified search) set this property to true
  hideTimeFilterInfo?: boolean;
}

export interface LayerConfigurationProps {
  attributes: TypedLensByValueInput['attributes'];
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  datasourceId: 'formBased' | 'textBased';
  framePublicAPI: FramePublicAPI;
  hasPadding?: boolean;
  setIsInlineFlyoutVisible: (flag: boolean) => void;
  getUserMessages: UserMessagesGetter;
  onlyAllowSwitchToSubtypes?: boolean;
}
