/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { render, unmountComponentAtNode } from 'react-dom';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { MountPoint } from '@kbn/core-mount-utils-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  OnSaveProps as SavedObjectOnSaveProps,
  SavedObjectSaveModal,
} from '@kbn/saved-objects-plugin/public';
import { EVENT_ANNOTATION_GROUP_TYPE } from '@kbn/event-annotation-plugin/common';
import { EuiIcon } from '@elastic/eui';
import { type SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { LayerAction, StateSetter } from '../../../../types';
import { XYByReferenceAnnotationLayerConfig, XYAnnotationLayerConfig, XYState } from '../../types';

type ModalOnSaveProps = SavedObjectOnSaveProps & { newTags: string[]; closeModal: () => void };

/** @internal exported for testing only */
export const SaveModal = ({
  domElement,
  savedObjectsTagging,
  onSave,
}: {
  domElement: HTMLDivElement;
  savedObjectsTagging: SavedObjectTaggingPluginStart | undefined;
  onSave: (props: ModalOnSaveProps) => void;
}) => {
  const initialTags: string[] = [];

  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);

  const closeModal = () => unmountComponentAtNode(domElement);

  return (
    <SavedObjectSaveModal
      onSave={async (props) => onSave({ ...props, closeModal, newTags: selectedTags })}
      onClose={closeModal}
      title={''}
      description={''}
      showCopyOnSave={false}
      objectType={EVENT_ANNOTATION_GROUP_TYPE}
      showDescription={true}
      confirmButtonLabel={
        <>
          <div>
            <EuiIcon type="save" />
          </div>
          <div>
            {i18n.translate(
              'xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary.confirmButton',
              { defaultMessage: 'Save annotation group' }
            )}
          </div>
        </>
      }
      options={
        savedObjectsTagging ? (
          <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
            initialSelection={initialTags}
            onTagsSelected={setSelectedTags}
          />
        ) : undefined
      }
    />
  );
};

/** @internal exported for testing only */
export const onSave = async ({
  state,
  layer,
  setState,
  eventAnnotationService,
  toasts,
  modalOnSaveProps: { newTitle, newDescription, newTags: selectedTags, closeModal },
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  setState: StateSetter<XYState, unknown>;
  eventAnnotationService: EventAnnotationServiceType;
  toasts: ToastsStart;
  modalOnSaveProps: ModalOnSaveProps;
}) => {
  let savedId: string;

  try {
    const { id } = await eventAnnotationService.createAnnotationGroup({
      ...layer,
      title: newTitle,
      description: newDescription,
      tags: selectedTags,
    });

    savedId = id;
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
    annotationGroupId: savedId,
    __lastSaved: {
      ...layer,
      title: newTitle,
      description: newDescription,
      tags: selectedTags,
    },
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
        <div>
          <FormattedMessage
            id="xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary.successToastBody"
            defaultMessage="View or manage in the {link}"
            values={{
              link: <a href="#">annotation library</a>,
            }}
          />
        </div>,
        element
      )) as MountPoint,
  });
};

export const getSaveLayerAction = ({
  state,
  layer,
  setState,
  eventAnnotationService,
  toasts,
  savedObjectsTagging,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  setState: StateSetter<XYState, unknown>;
  eventAnnotationService: EventAnnotationServiceType;
  isNew?: boolean;
  toasts: ToastsStart;
  savedObjectsTagging?: SavedObjectTaggingPluginStart;
}): LayerAction => {
  const displayName = false
    ? i18n.translate('xpack.lens.xyChart.annotations.addAnnotationGroupToLibrary', {
        defaultMessage: 'Add to library',
      })
    : i18n.translate('xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary', {
        defaultMessage: 'Save to library',
      });

  return {
    displayName,
    description: i18n.translate(
      'xpack.lens.xyChart.annotations.addAnnotationGroupToLibraryDescription',
      { defaultMessage: 'Saves annotation group as separate saved object' }
    ),
    execute: async (domElement) => {
      if (domElement) {
        render(
          <SaveModal
            domElement={domElement}
            savedObjectsTagging={savedObjectsTagging}
            onSave={async (props) => {
              await onSave({
                state,
                layer,
                setState,
                eventAnnotationService,
                toasts,
                modalOnSaveProps: props,
              });
            }}
          />,
          domElement
        );
      }
    },
    icon: 'save',
    isCompatible: true,
    'data-test-subj': 'lnsXY_annotationLayer_saveToLibrary',
  };
};
