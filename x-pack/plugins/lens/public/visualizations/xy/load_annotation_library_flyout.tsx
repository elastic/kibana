/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { SavedObjectCommon } from '@kbn/saved-objects-plugin/common';
import { FlyoutContainer } from '../../shared_components/flyout_container';

export function LoadAnnotationLibraryFlyout({
  eventAnnotationService,
  isLoadLibraryVisible,
  setLoadLibraryFlyoutVisible,
  addLayer,
}: {
  isLoadLibraryVisible: boolean;
  setLoadLibraryFlyoutVisible: (visible: boolean) => void;
  eventAnnotationService: EventAnnotationServiceType;
  addLayer: () => void;
}) {
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
    savedObject: SavedObjectCommon<unknown>;
  } | null>(null);

  // needed to clean the state when clicking not on the item on the list
  const hasBeenClicked = useRef(false);

  React.useEffect(() => {
    hasBeenClicked.current = false;
  }, [selectedItem]);

  const {
    renderEventAnnotationGroupSavedObjectFinder: EventAnnotationGroupSavedObjectFinder,
    loadAnnotationGroup,
  } = eventAnnotationService || {};

  return (
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
                  setLoadLibraryFlyoutVisible(false);
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
                  setLoadLibraryFlyoutVisible(false);
                  if (selectedItem) {
                    loadAnnotationGroup(selectedItem?.id).then((loadedGroup) => {
                      console.log('loadedGroup:', loadedGroup);
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
        setLoadLibraryFlyoutVisible(false);
        setSelectedItem(null);
        return true;
      }}
    >
      <div className="lnsIndexPatternDimensionEditor--padded">
        <EventAnnotationGroupSavedObjectFinder
          onChoose={({ id, type, fullName, savedObject }) => {
            hasBeenClicked.current = true;
            setSelectedItem({ id, type, fullName, savedObject });
          }}
          fixedPageSize={numberOfElements}
        />
      </div>
    </FlyoutContainer>
  );
}
