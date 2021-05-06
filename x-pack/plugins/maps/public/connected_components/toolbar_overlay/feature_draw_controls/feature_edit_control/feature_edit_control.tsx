/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DRAW_TYPE } from '../../../../../common/constants';
// @ts-expect-error
import { GeometryFilterForm } from '../../../../components/draw_forms/geometry_filter_form/geometry_filter_form';

export interface Props {
  isDrawingFilter: boolean;
  drawType: string;
  cancelDraw: () => void;
  initiateDraw: (drawFeatureState: DRAW_TYPE) => void;
}

export function FeatureEditControl(props: Props) {
  const editFeaturesSelected = props.drawType === DRAW_TYPE.SIMPLE_SELECT;
  const deleteFeaturesSelected = props.drawType === DRAW_TYPE.TRASH;

  return (
    <EuiPanel paddingSize="none" style={{ display: 'inline-block' }}>
      <EuiFlexGroup responsive={false} gutterSize="none" direction="column">
        <EuiFlexItem key={'line'} grow={false}>
          <EuiPanel
            paddingSize="none"
            className={`mapToolbarOverlay__button${editFeaturesSelected ? '__selected' : ''}`}
          >
            <EuiButtonIcon
              size="s"
              onClick={() => props.initiateDraw(DRAW_TYPE.SIMPLE_SELECT)}
              iconType="documentEdit"
              aria-label={i18n.translate(
                'xpack.maps.toolbarOverlay.featureEdit.editFeaturesLabel',
                {
                  defaultMessage: 'Edit features',
                }
              )}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureEdit.editFeaturesTitle', {
                defaultMessage: 'Edit features',
              })}
              aria-pressed={editFeaturesSelected}
              isSelected={editFeaturesSelected}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem key={'polygon'} grow={false}>
          <EuiPanel
            paddingSize="none"
            className={`mapToolbarOverlay__button${deleteFeaturesSelected ? '__selected' : ''}`}
          >
            <EuiButtonIcon
              size="s"
              onClick={() => props.initiateDraw(DRAW_TYPE.TRASH)}
              iconType="trash"
              aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureEdit.deleteLabel', {
                defaultMessage: 'Remove feature',
              })}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureEdit.deleteTitle', {
                defaultMessage: 'Remove feature',
              })}
              aria-pressed={deleteFeaturesSelected}
              isSelected={deleteFeaturesSelected}
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
