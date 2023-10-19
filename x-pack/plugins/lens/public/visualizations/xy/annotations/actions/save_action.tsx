/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { render, unmountComponentAtNode } from 'react-dom';
import type { ThemeServiceStart } from '@kbn/core/public';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { MountPoint } from '@kbn/core-mount-utils-browser';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import {
  OnSaveProps as SavedObjectOnSaveProps,
  SavedObjectSaveModal,
} from '@kbn/saved-objects-plugin/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import type { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import { EuiIcon, EuiLink } from '@elastic/eui';
import { type SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import type {
  LayerAction,
  RegisterLibraryAnnotationGroupFunction,
  StateSetter,
} from '../../../../types';
import { XYByReferenceAnnotationLayerConfig, XYAnnotationLayerConfig, XYState } from '../../types';
import {
  getAnnotationLayerTitle,
  getGroupMetadataFromAnnotationLayer,
  isByReferenceAnnotationsLayer,
} from '../../visualization_helpers';

type ModalOnSaveProps = SavedObjectOnSaveProps & { newTags: string[]; closeModal: () => void };

/** @internal exported for testing only */
export const SaveModal = ({
  domElement,
  savedObjectsTagging,
  onSave,
  title,
  description,
  tags,
  showCopyOnSave,
}: {
  domElement: HTMLDivElement;
  savedObjectsTagging: SavedObjectTaggingPluginStart | undefined;
  onSave: (props: ModalOnSaveProps) => void;
  title: string;
  description: string;
  tags: string[];
  showCopyOnSave: boolean;
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(tags);

  const closeModal = () => unmountComponentAtNode(domElement);

  return (
    <SavedObjectSaveModal
      onSave={async (props) => onSave({ ...props, closeModal, newTags: selectedTags })}
      onClose={closeModal}
      title={title}
      description={description}
      showCopyOnSave={showCopyOnSave}
      objectType={i18n.translate(
        'xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary.objectType',
        { defaultMessage: 'group' }
      )}
      customModalTitle={i18n.translate(
        'xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary.modalTitle',
        {
          defaultMessage: 'Save annotation group to library',
        }
      )}
      showDescription={true}
      confirmButtonLabel={
        <>
          <div>
            <EuiIcon type="save" />
          </div>
          <div>
            {i18n.translate(
              'xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary.confirmButton',
              { defaultMessage: 'Save group' }
            )}
          </div>
        </>
      }
      options={
        savedObjectsTagging ? (
          <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
            initialSelection={selectedTags}
            onTagsSelected={setSelectedTags}
            markOptional
          />
        ) : undefined
      }
    />
  );
};

const saveAnnotationGroupToLibrary = async (
  layer: XYAnnotationLayerConfig,
  {
    newTitle,
    newDescription,
    newTags,
    newCopyOnSave,
  }: Pick<ModalOnSaveProps, 'newTitle' | 'newDescription' | 'newTags' | 'newCopyOnSave'>,
  eventAnnotationService: EventAnnotationServiceType,
  dataViews: DataViewsContract
): Promise<{ id: string; config: EventAnnotationGroupConfig }> => {
  let savedId: string;

  const dataView = await dataViews.get(layer.indexPatternId);

  const saveAsNew = !isByReferenceAnnotationsLayer(layer) || newCopyOnSave;

  const groupConfig: EventAnnotationGroupConfig = {
    annotations: layer.annotations,
    indexPatternId: layer.indexPatternId,
    ignoreGlobalFilters: layer.ignoreGlobalFilters,
    title: newTitle,
    description: newDescription,
    tags: newTags,
    dataViewSpec: dataView.isPersisted() ? undefined : dataView.toSpec(false),
  };

  if (saveAsNew) {
    const { id } = await eventAnnotationService.createAnnotationGroup(groupConfig);
    savedId = id;
  } else {
    await eventAnnotationService.updateAnnotationGroup(groupConfig, layer.annotationGroupId);

    savedId = layer.annotationGroupId;
  }

  return { id: savedId, config: groupConfig };
};

const shouldStopBecauseDuplicateTitle = async (
  newTitle: string,
  existingTitle: string,
  newCopyOnSave: ModalOnSaveProps['newCopyOnSave'],
  onTitleDuplicate: ModalOnSaveProps['onTitleDuplicate'],
  isTitleDuplicateConfirmed: ModalOnSaveProps['isTitleDuplicateConfirmed'],
  eventAnnotationService: EventAnnotationServiceType
) => {
  if (isTitleDuplicateConfirmed || (newTitle === existingTitle && !newCopyOnSave)) {
    return false;
  }

  const duplicateExists = await eventAnnotationService.groupExistsWithTitle(newTitle);

  if (duplicateExists) {
    onTitleDuplicate();
    return true;
  } else {
    return false;
  }
};

/** @internal exported for testing only */
export const onSave = async ({
  state,
  layer,
  setState,
  registerLibraryAnnotationGroup,
  eventAnnotationService,
  toasts,
  modalOnSaveProps: {
    newTitle,
    newDescription,
    newTags,
    closeModal,
    newCopyOnSave,
    onTitleDuplicate,
    isTitleDuplicateConfirmed,
  },
  dataViews,
  goToAnnotationLibrary,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  setState: StateSetter<XYState, unknown>;
  registerLibraryAnnotationGroup: (props: {
    id: string;
    group: EventAnnotationGroupConfig;
  }) => void;
  eventAnnotationService: EventAnnotationServiceType;
  toasts: ToastsStart;
  modalOnSaveProps: ModalOnSaveProps;
  dataViews: DataViewsContract;
  goToAnnotationLibrary: () => Promise<void>;
}) => {
  const shouldStop = await shouldStopBecauseDuplicateTitle(
    newTitle,
    getAnnotationLayerTitle(layer),
    newCopyOnSave,
    onTitleDuplicate,
    isTitleDuplicateConfirmed,
    eventAnnotationService
  );

  if (shouldStop) return;

  let savedInfo: Awaited<ReturnType<typeof saveAnnotationGroupToLibrary>>;
  try {
    savedInfo = await saveAnnotationGroupToLibrary(
      layer,
      { newTitle, newDescription, newTags, newCopyOnSave },
      eventAnnotationService,
      dataViews
    );

    // add new group to state
    registerLibraryAnnotationGroup({
      id: savedInfo.id,
      group: savedInfo.config,
    });
  } catch (err) {
    toasts.addError(err, {
      title: i18n.translate(
        'xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary.errorToastTitle',
        {
          defaultMessage: 'Failed to save "{title}"',
          values: {
            title: newTitle,
          },
        }
      ),
    });

    return;
  }

  const newLayer: XYByReferenceAnnotationLayerConfig = {
    ...layer,
    annotationGroupId: savedInfo.id,
    __lastSaved: savedInfo.config,
  };

  setState({
    ...state,
    layers: state.layers.map((existingLayer) =>
      existingLayer.layerId === newLayer.layerId ? newLayer : existingLayer
    ),
  });

  closeModal();

  toasts.addSuccess({
    title: i18n.translate(
      'xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary.successToastTitle',
      {
        defaultMessage: 'Saved "{title}"',
        values: {
          title: newTitle,
        },
      }
    ),
    text: ((element) =>
      render(
        <I18nProvider>
          <FormattedMessage
            id="xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary.successToastBody"
            defaultMessage="View or manage in the {link}."
            values={{
              link: (
                <EuiLink
                  data-test-subj="lnsAnnotationLibraryLink"
                  onClick={() => goToAnnotationLibrary()}
                >
                  {i18n.translate(
                    'xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary.annotationLibrary',
                    {
                      defaultMessage: 'annotation library',
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </I18nProvider>,
        element
      )) as MountPoint,
  });
};

export const getSaveLayerAction = ({
  state,
  layer,
  setState,
  registerLibraryAnnotationGroup,
  eventAnnotationService,
  toasts,
  savedObjectsTagging,
  dataViews,
  goToAnnotationLibrary,
  kibanaTheme,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  setState: StateSetter<XYState, unknown>;
  registerLibraryAnnotationGroup: RegisterLibraryAnnotationGroupFunction;
  eventAnnotationService: EventAnnotationServiceType;
  toasts: ToastsStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
  dataViews: DataViewsContract;
  goToAnnotationLibrary: () => Promise<void>;
  kibanaTheme: ThemeServiceStart;
}): LayerAction => {
  const neverSaved = !isByReferenceAnnotationsLayer(layer);

  const displayName = i18n.translate(
    'xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary',
    {
      defaultMessage: 'Save to library',
    }
  );

  return {
    displayName,
    description: i18n.translate(
      'xpack.lens.xyChart.annotations.addAnnotationGroupToLibraryDescription',
      { defaultMessage: 'Saves annotation group as separate saved object' }
    ),
    execute: async (domElement) => {
      if (domElement) {
        const metadata = getGroupMetadataFromAnnotationLayer(layer);

        render(
          <KibanaThemeProvider theme$={kibanaTheme.theme$}>
            <I18nProvider>
              <SaveModal
                domElement={domElement}
                savedObjectsTagging={savedObjectsTagging}
                onSave={async (props) => {
                  await onSave({
                    state,
                    layer,
                    setState,
                    registerLibraryAnnotationGroup,
                    eventAnnotationService,
                    toasts,
                    modalOnSaveProps: props,
                    dataViews,
                    goToAnnotationLibrary,
                  });
                }}
                {...metadata}
                showCopyOnSave={!neverSaved}
              />
            </I18nProvider>
          </KibanaThemeProvider>,
          domElement
        );
      }
    },
    icon: 'save',
    isCompatible: true,
    'data-test-subj': 'lnsXY_annotationLayer_saveToLibrary',
    order: 100,
    showOutsideList: true,
  };
};
