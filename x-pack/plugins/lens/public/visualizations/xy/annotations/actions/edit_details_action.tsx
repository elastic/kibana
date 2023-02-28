/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { render, unmountComponentAtNode } from 'react-dom';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiForm,
  EuiFormRow,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { LayerAction, StateSetter } from '../../../../types';
import { FlyoutContainer } from '../../../../shared_components/flyout_container';
import type { XYState, XYAnnotationLayerConfig } from '../../types';

export const EditDetailsFlyout = ({
  domElement,
  groupLabel,
  title,
  isNew,
  onConfirm,
}: {
  domElement: Element;
  groupLabel: string;
  title?: string;
  isNew?: boolean;
  onConfirm: (title: string) => void;
}) => {
  const [newTitle, setNewTitle] = React.useState(title);
  // TODO: debounce title change to set in higher level state to persist when closing the flyout
  return (
    <FlyoutContainer
      isOpen={true}
      customFooter={
        isNew ? (
          <EuiFlyoutFooter className="lnsDimensionContainer__footer">
            <EuiFlexGroup
              responsive={false}
              gutterSize="s"
              alignItems="center"
              justifyContent="spaceBetween"
            >
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  flush="left"
                  size="s"
                  iconType="cross"
                  onClick={() => unmountComponentAtNode(domElement)}
                  data-test-subj="lns-indexPattern-loadLibraryCancel"
                >
                  {i18n.translate('xpack.lens.annotations.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => {
                    if (newTitle) {
                      onConfirm(newTitle);
                      // todo: notification?
                      unmountComponentAtNode(domElement);
                    }
                  }}
                  iconType="plusInCircleFilled"
                  fill
                  color="success"
                  // disabled={!selectedItem} // TODO: disable if no title
                >
                  {i18n.translate('xpack.lens.annotations.addToLibrary', {
                    defaultMessage: 'Add to library',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        ) : undefined
      }
      groupLabel={groupLabel}
      handleClose={() => {
        unmountComponentAtNode(domElement);
        return true;
      }}
    >
      <div>
        <div className="lnsIndexPatternDimensionEditor--padded">
          <EuiForm data-test-subj="editDetails">
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.lens.xyChart.annotations.titleLabel"
                  defaultMessage="Title"
                />
              }
            >
              <EuiFieldText
                fullWidth
                data-test-subj="savedObjectTitle"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                }}
                isInvalid={!'isDuplicate' || newTitle?.length === 0}
              />
            </EuiFormRow>
          </EuiForm>
        </div>
      </div>
    </FlyoutContainer>
  );
};

export const getEditDetailsAction = ({
  state,
  layer,
  layerIndex,
  setState,
  core,
  isNew,
}: {
  state: XYState;
  layer: XYAnnotationLayerConfig;
  layerIndex: number;
  setState: StateSetter<XYState, unknown>;
  core: CoreStart;
  isNew?: boolean;
}): LayerAction => {
  const displayName = i18n.translate('xpack.lens.xyChart.annotations.editAnnotationGroupDetails', {
    defaultMessage: 'Edit annotation group details',
  });
  return {
    displayName,
    description: i18n.translate(
      'xpack.lens.xyChart.annotations.editAnnotationGroupDetailsDescription',
      { defaultMessage: 'Edit title, description and tags of the annotation group' }
    ),
    execute: async (domElement) => {
      console.log('what', domElement);
      if (domElement) {
        render(
          <EditDetailsFlyout
            domElement={domElement}
            groupLabel={displayName}
            title="Hello"
            onConfirm={() => {}}
          />,
          domElement
        );
      }
    },
    icon: 'pencil',
    isCompatible: true,
    'data-test-subj': 'lnsXY_annotationLayer_editAnnotationDetails',
  };
};
