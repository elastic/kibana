/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './layer_panel.scss';

import React, { useCallback, useRef } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SimpleSavedObject } from '@kbn/core/public';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import { EventAnnotationService } from '@kbn/event-annotation-plugin/public';
import { FlyoutContainer } from '../../../shared_components/flyout_container';
import {
  useLensSelector,
  selectIsLoadLibraryVisible,
  setIsLoadLibraryVisible,
  useLensDispatch,
  addLayer as addLayerAction,
} from '../../../state_management';

import { Visualization } from '../../../types';
import { generateId } from '../../../id_generator';

// TODO: this module should be moved to the xy visualization
export function LoadAnnotationLibraryFlyout({
  layerId,
  activeVisualization,
  eventAnnotationService,
}: {
  activeVisualization: Visualization;
  layerId: string;
  eventAnnotationService: EventAnnotationService;
}) {
  const dispatchLens = useLensDispatch();
  const setLibraryVisible = useCallback(
    (visible: boolean) => {
      dispatchLens(setIsLoadLibraryVisible(visible));
    },
    [dispatchLens]
  );
  const addLayer = () => {
    dispatchLens(addLayerAction({ layerId: generateId(), layerType: LayerTypes.ANNOTATIONS }));
  };

  const isLoadLibraryVisible = useLensSelector(selectIsLoadLibraryVisible);
  const containerPanelRef = useRef<HTMLDivElement | null>(null);
  const otherElementsHeight = 250;
  const singleEntryHeight = 40;
  const numberOfElements = Math.floor(
    ((containerPanelRef?.current?.clientHeight || 800) - otherElementsHeight) / singleEntryHeight
  );

  const [selectedItem, setSelectedItem] = React.useState<{
    id: string;
    type: string;
    fullName: string;
    savedObject: SimpleSavedObject<unknown>;
  } | null>(null);

  // needed to clean the state when clicking not on the item on the list
  const hasBeenClicked = useRef(false);

  React.useEffect(() => {
    hasBeenClicked.current = false;
  }, [selectedItem]);

  const {
    renderEventAnnotationGroupSavedObjectFinder: EventAnnotationGroupSavedObjectFinder,
    loadAnnotationGroup,
  } = eventAnnotationService.eventAnnotationService || {};

  return (
    (activeVisualization && (
      <FlyoutContainer
        onClickInside={() => {
          if (!hasBeenClicked.current) {
            setSelectedItem(null);
          }
        }}
        panelContainerRef={(el) => (containerPanelRef.current = el)}
        customFooter={
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
                  onClick={() => {
                    setLibraryVisible(false);
                    setSelectedItem(null);
                  }}
                  data-test-subj="lns-indexPattern-loadLibraryCancel"
                >
                  {i18n.translate('xpack.lens.loadAnnotationsLibrary.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  onClick={() => {
                    setLibraryVisible(false);
                    if (selectedItem) {
                      loadAnnotationGroup(selectedItem?.id).then((res) => {
                        console.log('res', res);
                        addLayer();
                      });
                    }
                  }}
                  iconType="folderOpen"
                  fill
                  disabled={!selectedItem}
                >
                  {i18n.translate('xpack.lens.loadAnnotationsLibrary.loadSelected', {
                    defaultMessage: 'Load selected',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        }
        isOpen={Boolean(isLoadLibraryVisible)}
        groupLabel={i18n.translate('xpack.lens.editorFrame.loadFromLibrary', {
          defaultMessage: 'Select annotations from library',
        })}
        handleClose={() => {
          setLibraryVisible(false);
          setSelectedItem(null);
          return true;
        }}
      >
        <div className="lnsIndexPatternDimensionEditor--padded" id={layerId}>
          <EventAnnotationGroupSavedObjectFinder
            onChoose={({ id, type, fullName, savedObject }) => {
              hasBeenClicked.current = true;
              setSelectedItem({ id, type, fullName, savedObject });
            }}
            fixedPageSize={numberOfElements}
          />
        </div>
      </FlyoutContainer>
    )) ||
    null
  );
}
