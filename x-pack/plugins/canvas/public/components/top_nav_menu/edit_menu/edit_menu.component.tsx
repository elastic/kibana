/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import PropTypes from 'prop-types';
import { EuiContextMenu, EuiIcon, EuiFocusTrap, EuiOutsideClickDetector } from '@elastic/eui';
import { OverlayModalStart } from 'kibana/public';
import { toMountPoint } from '../../../../../../../src/plugins/kibana_react/public';
import { ComponentStrings } from '../../../../i18n/components';
import { ShortcutStrings } from '../../../../i18n/shortcuts';
import { flattenPanelTree } from '../../../lib/flatten_panel_tree';
import { CustomElementModal } from '../../custom_element_modal';
import { CONTEXT_MENU_TOP_BORDER_CLASSNAME } from '../../../../common/lib/constants';
import { AssetType, PositionedElement } from '../../../../types';
import { AssetManager } from '../../asset_manager';

const { WorkpadHeaderEditMenu: strings } = ComponentStrings;
const shortcutHelp = ShortcutStrings.getShortcutHelp();

export interface Props {
  /** The assets to display within the modal */
  assets: AssetType[];
  /** indicated whether the selected element is a group or not */
  groupIsSelected: boolean;
  /** Is there element clipboard data to paste? */
  hasPasteData: boolean;
  /** only more than one selected element can be grouped */
  selectedNodes: PositionedElement[];
  /** cuts selected elements */
  cutNodes: () => void;
  /** copies selected elements to clipboard */
  copyNodes: () => void;
  /** pastes elements stored in clipboard to page */
  pasteNodes: () => void;
  /** clones selected elements */
  cloneNodes: () => void;
  /** deletes selected elements */
  deleteNodes: () => void;
  /** moves selected element to top layer */
  bringToFront: () => void;
  /** moves selected element up one layer */
  bringForward: () => void;
  /** moves selected element down one layer */
  sendBackward: () => void;
  /** moves selected element to bottom layer */
  sendToBack: () => void;
  /** saves the selected elements as an custom-element saved object */
  createCustomElement: (name: string, description: string, image: string) => void;
  /** groups selected elements */
  groupNodes: () => void;
  /** ungroups selected group */
  ungroupNodes: () => void;
  /** left align selected elements */
  alignLeft: () => void;
  /** center align selected elements */
  alignCenter: () => void;
  /** right align selected elements */
  alignRight: () => void;
  /** top align selected elements */
  alignTop: () => void;
  /** middle align selected elements */
  alignMiddle: () => void;
  /** bottom align selected elements */
  alignBottom: () => void;
  /** horizontally distribute selected elements */
  distributeHorizontally: () => void;
  /** vertically distribute selected elements */
  distributeVertically: () => void;
  /** Reverts last change to the workpad */
  undoHistory: () => void;
  /** Reapplies last reverted change to the workpad */
  redoHistory: () => void;
  /** Handler for closing the menu */
  onClose: () => void;
  /** Handles opening modals */
  openModal: OverlayModalStart['open'];
  /** Handler for adding an asset */
  onAddAsset: (file: File) => void;
  /** The function to execute when the user clicks 'Create' */
  onCreateAsset: (assetId: string) => void;
  /** The function to execute when the user clicks 'Delete' */
  onDeleteAsset: (asset: AssetType) => void;
}

export const EditMenu: FC<Props> = ({
  assets,
  groupIsSelected,
  hasPasteData,
  selectedNodes,
  cutNodes,
  copyNodes,
  pasteNodes,
  deleteNodes,
  cloneNodes,
  bringToFront,
  bringForward,
  sendBackward,
  sendToBack,
  alignLeft,
  alignCenter,
  alignRight,
  alignTop,
  alignMiddle,
  alignBottom,
  distributeHorizontally,
  distributeVertically,
  createCustomElement,
  groupNodes,
  ungroupNodes,
  undoHistory,
  redoHistory,
  onClose,
  openModal,
  onAddAsset,
  onCreateAsset,
  onDeleteAsset,
}) => {
  const [isSaveElementModalVisible, setSaveElementModal] = useState(false);
  const showSaveElementModal = () => setSaveElementModal(true);
  const hideSaveElementModal = () => setSaveElementModal(false);

  const handleSave = (name: string, description: string, image: string) => {
    createCustomElement(name, description, image);
    hideSaveElementModal();
  };

  const getPanelTree = () => {
    const groupMenuItem = groupIsSelected
      ? {
          name: strings.getUngroupMenuItemLabel(),
          className: CONTEXT_MENU_TOP_BORDER_CLASSNAME,
          icon: <EuiIcon type="empty" size="m" />,
          onClick: () => {
            ungroupNodes();
            onClose();
          },
        }
      : {
          name: strings.getGroupMenuItemLabel(),
          className: CONTEXT_MENU_TOP_BORDER_CLASSNAME,
          icon: <EuiIcon type="empty" size="m" />,
          disabled: selectedNodes.length < 2,
          onClick: () => {
            groupNodes();
            onClose();
          },
        };

    const orderMenuItem = {
      name: strings.getOrderMenuItemLabel(),
      disabled: selectedNodes.length !== 1, // TODO: change to === 0 when we support relayering multiple elements
      icon: <EuiIcon type="empty" size="m" />,
      panel: {
        id: 1,
        title: strings.getOrderMenuItemLabel(),
        items: [
          {
            name: shortcutHelp.BRING_TO_FRONT, // TODO: check against current element position and disable if already top layer
            icon: 'sortUp',
            onClick: bringToFront,
          },
          {
            name: shortcutHelp.BRING_FORWARD, // TODO: same as above
            icon: 'arrowUp',
            onClick: bringForward,
          },
          {
            name: shortcutHelp.SEND_BACKWARD, // TODO: check against current element position and disable if already bottom layer
            icon: 'arrowDown',
            onClick: sendBackward,
          },
          {
            name: shortcutHelp.SEND_TO_BACK, // TODO: same as above
            icon: 'sortDown',
            onClick: sendToBack,
          },
        ],
      },
    };

    const alignmentMenuItem = {
      name: strings.getAlignmentMenuItemLabel(),
      className: 'canvasContextMenu',
      disabled: groupIsSelected || selectedNodes.length < 2,
      icon: <EuiIcon type="empty" size="m" />,
      panel: {
        id: 2,
        title: strings.getAlignmentMenuItemLabel(),
        items: [
          {
            name: strings.getLeftAlignMenuItemLabel(),
            icon: 'editorItemAlignLeft',
            onClick: () => {
              alignLeft();
              onClose();
            },
          },
          {
            name: strings.getCenterAlignMenuItemLabel(),
            icon: 'editorItemAlignCenter',
            onClick: () => {
              alignCenter();
              onClose();
            },
          },
          {
            name: strings.getRightAlignMenuItemLabel(),
            icon: 'editorItemAlignRight',
            onClick: () => {
              alignRight();
              onClose();
            },
          },
          {
            name: strings.getTopAlignMenuItemLabel(),
            icon: 'editorItemAlignTop',
            onClick: () => {
              alignTop();
              onClose();
            },
          },
          {
            name: strings.getMiddleAlignMenuItemLabel(),
            icon: 'editorItemAlignMiddle',
            onClick: () => {
              alignMiddle();
              onClose();
            },
          },
          {
            name: strings.getBottomAlignMenuItemLabel(),
            icon: 'editorItemAlignBottom',
            onClick: () => {
              alignBottom();
              onClose();
            },
          },
        ],
      },
    };

    const distributionMenuItem = {
      name: strings.getDistributionMenuItemLabel(),
      className: 'canvasContextMenu',
      disabled: groupIsSelected || selectedNodes.length < 3,
      icon: <EuiIcon type="empty" size="m" />,
      panel: {
        id: 3,
        title: strings.getAlignmentMenuItemLabel(),
        items: [
          {
            name: strings.getHorizontalDistributionMenuItemLabel(),
            icon: 'editorDistributeHorizontal',
            onClick: () => {
              distributeHorizontally();
              onClose();
            },
          },
          {
            name: strings.getVerticalDistributionMenuItemLabel(),
            icon: 'editorDistributeVertical',
            onClick: () => {
              distributeVertically();
              onClose();
            },
          },
        ],
      },
    };

    const manageAssetMenuItem = {
      name: strings.getAssetsMenuItemLabel(),
      icon: <EuiIcon type="empty" size="m" />,
      className: CONTEXT_MENU_TOP_BORDER_CLASSNAME,
      'data-test-subj': 'canvasWorkpadEditMenu__manageAssetsButton',
      onClick: () => {
        openAssetModal();
        onClose();
      },
    };

    const savedElementMenuItem = {
      name: strings.getSaveElementMenuItemLabel(),
      icon: <EuiIcon type="indexOpen" size="m" />,
      disabled: selectedNodes.length < 1,
      'data-test-subj': 'canvasWorkpadEditMenu__saveElementButton',
      onClick: () => {
        showSaveElementModal();
        onClose();
      },
    };

    const items = [
      {
        // TODO: check history and disable when there are no more changes to revert
        name: strings.getUndoMenuItemLabel(),
        icon: <EuiIcon type="editorUndo" size="m" />,
        onClick: () => {
          undoHistory();
        },
      },
      {
        // TODO: check history and disable when there are no more changes to reapply
        name: strings.getRedoMenuItemLabel(),
        icon: <EuiIcon type="editorRedo" size="m" />,
        onClick: () => {
          redoHistory();
        },
      },
      {
        name: shortcutHelp.CUT,
        icon: <EuiIcon type="cut" size="m" />,
        className: CONTEXT_MENU_TOP_BORDER_CLASSNAME,
        disabled: selectedNodes.length < 1,
        onClick: () => {
          cutNodes();
          onClose();
        },
      },
      {
        name: shortcutHelp.COPY,
        disabled: selectedNodes.length < 1,
        icon: <EuiIcon type="copy" size="m" />,
        onClick: () => {
          copyNodes();
        },
      },
      {
        name: shortcutHelp.PASTE, // TODO: can this be disabled if clipboard is empty?
        icon: <EuiIcon type="copyClipboard" size="m" />,
        disabled: !hasPasteData,
        onClick: () => {
          pasteNodes();
          onClose();
        },
      },
      {
        name: shortcutHelp.DELETE,
        icon: <EuiIcon type="trash" size="m" />,
        disabled: selectedNodes.length < 1,
        onClick: () => {
          deleteNodes();
          onClose();
        },
      },
      {
        name: shortcutHelp.CLONE,
        icon: <EuiIcon type="empty" size="m" />,
        disabled: selectedNodes.length < 1,
        onClick: () => {
          cloneNodes();
          onClose();
        },
      },
      groupMenuItem,
      orderMenuItem,
      alignmentMenuItem,
      distributionMenuItem,
      manageAssetMenuItem,
      savedElementMenuItem,
    ];

    return {
      id: 0,
      // title: strings.getEditMenuLabel(),
      items,
    };
  };

  const openAssetModal = () => {
    return new Promise((resolve) => {
      const session = openModal(
        toMountPoint(
          <EuiFocusTrap
            clickOutsideDisables={true}
            initialFocus={'.canvasAssetManager__fileUploadWrapper'}
          >
            <EuiOutsideClickDetector onOutsideClick={() => {}}>
              <AssetManager
                assets={assets}
                onAddAsset={onAddAsset}
                onCreateAsset={onCreateAsset}
                onDeleteAsset={onDeleteAsset}
                onClose={() => session.close()}
              />
            </EuiOutsideClickDetector>
          </EuiFocusTrap>
        ),
        {
          'data-test-subj': 'canvasManageAssetModal',
          maxWidth: 550,
        }
      );
    });
  };

  return (
    <div>
      <EuiContextMenu initialPanelId={0} panels={flattenPanelTree(getPanelTree())} />
      {isSaveElementModalVisible ? (
        <CustomElementModal
          title={strings.getCreateElementModalTitle()}
          onSave={handleSave}
          onCancel={hideSaveElementModal}
        />
      ) : null}
    </div>
  );
};

EditMenu.propTypes = {
  cutNodes: PropTypes.func.isRequired,
  copyNodes: PropTypes.func.isRequired,
  pasteNodes: PropTypes.func.isRequired,
  deleteNodes: PropTypes.func.isRequired,
  cloneNodes: PropTypes.func.isRequired,
  bringToFront: PropTypes.func.isRequired,
  bringForward: PropTypes.func.isRequired,
  sendBackward: PropTypes.func.isRequired,
  sendToBack: PropTypes.func.isRequired,
  alignLeft: PropTypes.func.isRequired,
  alignCenter: PropTypes.func.isRequired,
  alignRight: PropTypes.func.isRequired,
  alignTop: PropTypes.func.isRequired,
  alignMiddle: PropTypes.func.isRequired,
  alignBottom: PropTypes.func.isRequired,
  distributeHorizontally: PropTypes.func.isRequired,
  distributeVertically: PropTypes.func.isRequired,
  createCustomElement: PropTypes.func.isRequired,
  selectedNodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  groupIsSelected: PropTypes.bool.isRequired,
  groupNodes: PropTypes.func.isRequired,
  ungroupNodes: PropTypes.func.isRequired,
};
