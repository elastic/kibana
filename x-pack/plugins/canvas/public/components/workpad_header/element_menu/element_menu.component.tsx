/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sortBy } from 'lodash';
import React, { FunctionComponent, useState } from 'react';
import PropTypes from 'prop-types';
import { EuiContextMenu, EuiIcon, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PrimaryActionPopover } from '@kbn/presentation-util-plugin/public';
import { getId } from '../../../lib/get_id';
import { CONTEXT_MENU_TOP_BORDER_CLASSNAME } from '../../../../common/lib';
import { ElementSpec } from '../../../../types';
import { flattenPanelTree } from '../../../lib/flatten_panel_tree';
import { AssetManager } from '../../asset_manager';
import { ClosePopoverFn } from '../../popover';
import { SavedElementsModal } from '../../saved_elements_modal';

interface CategorizedElementLists {
  [key: string]: ElementSpec[];
}

interface ElementTypeMeta {
  [key: string]: { name: string; icon: string };
}

const strings = {
  getAssetsMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderElementMenu.manageAssetsMenuItemLabel', {
      defaultMessage: 'Manage assets',
    }),
  getChartMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderElementMenu.chartMenuItemLabel', {
      defaultMessage: 'Chart',
    }),
  getElementMenuButtonLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderElementMenu.elementMenuButtonLabel', {
      defaultMessage: 'Add element',
    }),
  getElementMenuLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderElementMenu.elementMenuLabel', {
      defaultMessage: 'Add an element',
    }),
  getFilterMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderElementMenu.filterMenuItemLabel', {
      defaultMessage: 'Filter',
    }),
  getImageMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderElementMenu.imageMenuItemLabel', {
      defaultMessage: 'Image',
    }),
  getMyElementsMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderElementMenu.myElementsMenuItemLabel', {
      defaultMessage: 'My elements',
    }),
  getOtherMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderElementMenu.otherMenuItemLabel', {
      defaultMessage: 'Other',
    }),
  getProgressMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderElementMenu.progressMenuItemLabel', {
      defaultMessage: 'Progress',
    }),
  getShapeMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderElementMenu.shapeMenuItemLabel', {
      defaultMessage: 'Shape',
    }),
  getTextMenuItemLabel: () =>
    i18n.translate('xpack.canvas.workpadHeaderElementMenu.textMenuItemLabel', {
      defaultMessage: 'Text',
    }),
};

// label and icon for the context menu item for each element type
const elementTypeMeta: ElementTypeMeta = {
  chart: { name: strings.getChartMenuItemLabel(), icon: 'visArea' },
  filter: { name: strings.getFilterMenuItemLabel(), icon: 'filter' },
  image: { name: strings.getImageMenuItemLabel(), icon: 'image' },
  other: { name: strings.getOtherMenuItemLabel(), icon: 'empty' },
  progress: { name: strings.getProgressMenuItemLabel(), icon: 'visGoal' },
  shape: { name: strings.getShapeMenuItemLabel(), icon: 'node' },
  text: { name: strings.getTextMenuItemLabel(), icon: 'visText' },
};

const getElementType = (element: ElementSpec): string =>
  element && element.type && Object.keys(elementTypeMeta).includes(element.type)
    ? element.type
    : 'other';

const categorizeElementsByType = (elements: ElementSpec[]): { [key: string]: ElementSpec[] } => {
  elements = sortBy(elements, 'displayName');

  const categories: CategorizedElementLists = { other: [] };

  elements.forEach((element: ElementSpec) => {
    const type = getElementType(element);

    if (categories[type]) {
      categories[type].push(element);
    } else {
      categories[type] = [element];
    }
  });

  return categories;
};

export interface Props {
  /**
   * Dictionary of elements from elements registry
   */
  elements: { [key: string]: ElementSpec };
  /**
   * Handler for adding a selected element to the workpad
   */
  addElement: (element: Partial<ElementSpec>) => void;
}

export const ElementMenu: FunctionComponent<Props> = ({ elements, addElement }) => {
  const [isAssetModalVisible, setAssetModalVisible] = useState(false);
  const [isSavedElementsModalVisible, setSavedElementsModalVisible] = useState(false);

  const hideAssetModal = () => setAssetModalVisible(false);
  const showAssetModal = () => setAssetModalVisible(true);
  const hideSavedElementsModal = () => setSavedElementsModalVisible(false);
  const showSavedElementsModal = () => setSavedElementsModalVisible(true);

  const {
    chart: chartElements,
    filter: filterElements,
    image: imageElements,
    other: otherElements,
    progress: progressElements,
    shape: shapeElements,
    text: textElements,
  } = categorizeElementsByType(Object.values(elements));

  const getPanelTree = (closePopover: ClosePopoverFn) => {
    const elementToMenuItem = (element: ElementSpec): EuiContextMenuPanelItemDescriptor => ({
      name: element.displayName || element.name,
      icon: element.icon,
      onClick: () => {
        addElement(element);
        closePopover();
      },
    });

    const elementListToMenuItems = (elementList: ElementSpec[]) => {
      const type = getElementType(elementList[0]);
      const { name, icon } = elementTypeMeta[type] || elementTypeMeta.other;

      if (elementList.length > 1) {
        return {
          name,
          icon: <EuiIcon type={icon} size="m" />,
          panel: {
            id: getId('element-type'),
            title: name,
            items: elementList.map(elementToMenuItem),
          },
        };
      }

      return elementToMenuItem(elementList[0]);
    };

    return {
      id: 0,
      items: [
        elementListToMenuItems(textElements),
        elementListToMenuItems(shapeElements),
        elementListToMenuItems(chartElements),
        elementListToMenuItems(imageElements),
        elementListToMenuItems(filterElements),
        elementListToMenuItems(progressElements),
        elementListToMenuItems(otherElements),
        {
          name: strings.getMyElementsMenuItemLabel(),
          className: CONTEXT_MENU_TOP_BORDER_CLASSNAME,
          'data-test-subj': 'saved-elements-menu-option',
          icon: <EuiIcon type="empty" size="m" />,
          onClick: () => {
            showSavedElementsModal();
            closePopover();
          },
        },
        {
          name: strings.getAssetsMenuItemLabel(),
          icon: <EuiIcon type="empty" size="m" />,
          onClick: () => {
            showAssetModal();
            closePopover();
          },
        },
      ],
    };
  };

  return (
    <>
      <PrimaryActionPopover
        panelPaddingSize="none"
        label={strings.getElementMenuButtonLabel()}
        iconType="plusInCircle"
        data-test-subj="add-element-button"
      >
        {({ closePopover }: { closePopover: ClosePopoverFn }) => (
          <EuiContextMenu
            initialPanelId={0}
            panels={flattenPanelTree(getPanelTree(closePopover))}
          />
        )}
      </PrimaryActionPopover>
      {isAssetModalVisible ? <AssetManager onClose={hideAssetModal} /> : null}
      {isSavedElementsModalVisible ? <SavedElementsModal onClose={hideSavedElementsModal} /> : null}
    </>
  );
};

ElementMenu.propTypes = {
  elements: PropTypes.object,
  addElement: PropTypes.func.isRequired,
};
