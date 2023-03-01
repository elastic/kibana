/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { render } from 'react-dom';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { MountPoint } from '@kbn/core-mount-utils-browser';
import { FormattedMessage } from '@kbn/i18n-react';
import type { LayerAction, StateSetter } from '../../../../types';
import { XYByReferenceAnnotationLayerConfig, XYAnnotationLayerConfig, XYState } from '../../types';
import { EditDetailsFlyout } from './edit_details_action';

// exported for testing only
export const Flyout = ({
  domElement,
  state,
  layer,
  setState,
  eventAnnotationService,
  toasts,
}: {
  domElement: HTMLDivElement;
  state: XYState;
  layer: XYAnnotationLayerConfig;
  setState: StateSetter<XYState, unknown>;
  eventAnnotationService: EventAnnotationServiceType;
  toasts: ToastsStart;
}) => (
  <EditDetailsFlyout
    domElement={domElement}
    groupLabel={i18n.translate('xpack.lens.xyChart.annotations.addAnnotationGroupToLibrary', {
      defaultMessage: 'Add annotation group to library',
    })}
    onConfirm={async (title) => {
      let savedId: string;

      try {
        const { id } = await eventAnnotationService.createAnnotationGroup({
          ...layer,
          title,
        });

        savedId = id;
      } catch (err) {
        toasts.addError(err, {
          title: i18n.translate(
            'xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary.errorToastTitle',
            {
              defaultMessage: 'Failed to save "{title}"',
              values: {
                title,
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
          title,
          ...layer,
        },
      };

      setState({
        ...state,
        layers: state.layers.map((existingLayer) =>
          existingLayer.layerId === newLayer.layerId ? newLayer : existingLayer
        ),
      });

      toasts.addSuccess({
        title: i18n.translate(
          'xpack.lens.xyChart.annotations.saveAnnotationGroupToLibrary.successToastTitle',
          {
            defaultMessage: 'Saved "{title}"',
            values: {
              title,
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
    }}
  />
);

export const getSaveLayerAction = (props: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  setState: StateSetter<XYState, unknown>;
  eventAnnotationService: EventAnnotationServiceType;
  isNew?: boolean;
  toasts: ToastsStart;
}): LayerAction => {
  const displayName = props.isNew
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
      if (props.isNew && domElement) {
        render(<Flyout {...props} domElement={domElement} />, domElement);
      } else {
        return props.eventAnnotationService.createAnnotationGroup(props.layer).then();
      }
    },
    icon: 'save',
    isCompatible: true,
    'data-test-subj': 'lnsXY_annotationLayer_saveToLibrary',
  };
};
