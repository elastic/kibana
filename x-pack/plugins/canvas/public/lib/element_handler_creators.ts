/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { camelCase } from 'lodash';
import { getClipboardData, setClipboardData } from './clipboard';
import { cloneSubgraphs } from './clone_subgraphs';
import { notifyService } from '../services';
import * as customElementService from './custom_element_service';
import { getId } from './get_id';
import { PositionedElement } from '../../types';
import { ELEMENT_NUDGE_OFFSET, ELEMENT_SHIFT_OFFSET } from '../../common/lib/constants';

const extractId = (node: { id: string }): string => node.id;

export interface Props {
  /**
   * ID of the active page
   */
  pageId: string;
  /**
   * array of selected elements
   */
  selectedNodes: PositionedElement[];
  /**
   * adds elements to the page
   */
  insertNodes: (elements: PositionedElement[], pageId: string) => void;
  /**
   * changes the layer position of an element
   */
  elementLayer: (pageId: string, elementId: string, movement: number) => void;
  /**
   * selects elements on the page
   */
  selectToplevelNodes: (elements: PositionedElement[]) => void;
  /**
   * deletes elements from the page
   */
  removeNodes: (nodeIds: string[], pageId: string) => void;
  /**
   * commits events to layout engine
   */
  commit: (eventType: string, config: { event: string }) => void;
  /**
   * sets new position for multiple elements
   */
  setMultiplePositions: (elements: PositionedElement[]) => void;
}

// handlers for clone, delete, and saving custom elements
export const basicHandlerCreators = {
  cloneNodes: ({ insertNodes, pageId, selectToplevelNodes, selectedNodes }: Props) => (): void => {
    const clonedNodes = selectedNodes && cloneSubgraphs(selectedNodes);
    if (clonedNodes) {
      insertNodes(clonedNodes, pageId);
      selectToplevelNodes(clonedNodes);
    }
  },
  deleteNodes: ({ pageId, removeNodes, selectedNodes }: Props) => (): void => {
    if (selectedNodes.length) {
      removeNodes(selectedNodes.map(extractId), pageId);
    }
  },
  createCustomElement: ({ selectedNodes }: Props) => (
    name = '',
    description = '',
    image = ''
  ): void => {
    if (selectedNodes.length) {
      const content = JSON.stringify({ selectedNodes });
      const customElement = {
        id: getId('custom-element'),
        name: camelCase(name),
        displayName: name,
        help: description,
        image,
        content,
      };
      customElementService
        .create(customElement)
        .then(() =>
          notifyService
            .getService()
            .success(
              `Custom element '${customElement.displayName || customElement.id}' was saved`,
              {
                'data-test-subj': 'canvasCustomElementCreate-success',
              }
            )
        )
        .catch((error: Error) =>
          notifyService.getService().warning(error, {
            title: `Custom element '${
              customElement.displayName || customElement.id
            }' was not saved`,
          })
        );
    }
  },
};

// handlers for alignment and distribution
export const alignmentDistributionHandlerCreators = Object.assign(
  {},
  ...[
    'alignLeft',
    'alignCenter',
    'alignRight',
    'alignTop',
    'alignMiddle',
    'alignBottom',
    'distributeHorizontally',
    'distributeVertically',
  ].map((event: string) => ({
    [event]: ({ commit }: Props) => (): void => {
      commit('actionEvent', { event });
    },
  }))
);

// handlers for group and ungroup
export const groupHandlerCreators = {
  groupNodes: ({ commit }: Props) => (): void => {
    commit('actionEvent', { event: 'group' });
  },
  ungroupNodes: ({ commit }: Props) => (): void => {
    commit('actionEvent', { event: 'ungroup' });
  },
};

// handlers for cut/copy/paste
export const clipboardHandlerCreators = {
  cutNodes: ({ pageId, removeNodes, selectedNodes }: Props) => (): void => {
    if (selectedNodes.length) {
      setClipboardData({ selectedNodes });
      removeNodes(selectedNodes.map(extractId), pageId);
      notifyService.getService().success('Cut element to clipboard');
    }
  },
  copyNodes: ({ selectedNodes }: Props) => (): void => {
    if (selectedNodes.length) {
      setClipboardData({ selectedNodes });
      notifyService.getService().success('Copied element to clipboard');
    }
  },
  pasteNodes: ({ insertNodes, pageId, selectToplevelNodes }: Props) => (): void => {
    const { selectedNodes = [] } = JSON.parse(getClipboardData()) || {};
    const clonedNodes = selectedNodes && cloneSubgraphs(selectedNodes);
    if (clonedNodes) {
      insertNodes(clonedNodes, pageId); // first clone and persist the new node(s)
      selectToplevelNodes(clonedNodes); // then select the cloned node(s)
    }
  },
};

// handlers for changing element layer position
// TODO: support relayering multiple elements
export const layerHandlerCreators = {
  bringToFront: ({ elementLayer, pageId, selectedNodes }: Props) => (): void => {
    if (selectedNodes.length === 1) {
      elementLayer(pageId, selectedNodes[0].id, Infinity);
    }
  },
  bringForward: ({ elementLayer, pageId, selectedNodes }: Props) => (): void => {
    if (selectedNodes.length === 1) {
      elementLayer(pageId, selectedNodes[0].id, 1);
    }
  },
  sendBackward: ({ elementLayer, pageId, selectedNodes }: Props) => (): void => {
    if (selectedNodes.length === 1) {
      elementLayer(pageId, selectedNodes[0].id, -1);
    }
  },
  sendToBack: ({ elementLayer, pageId, selectedNodes }: Props) => (): void => {
    if (selectedNodes.length === 1) {
      elementLayer(pageId, selectedNodes[0].id, -Infinity);
    }
  },
};

// handlers for shifting elements up, down, left, and right
export const positionHandlerCreators = {
  shiftUp: ({ selectedNodes, setMultiplePositions }: Props) => (): void => {
    setMultiplePositions(
      selectedNodes.map((element) => {
        element.position.top -= ELEMENT_SHIFT_OFFSET;
        return element;
      })
    );
  },
  shiftDown: ({ selectedNodes, setMultiplePositions }: Props) => (): void => {
    setMultiplePositions(
      selectedNodes.map((element) => {
        element.position.top += ELEMENT_SHIFT_OFFSET;
        return element;
      })
    );
  },
  shiftLeft: ({ selectedNodes, setMultiplePositions }: Props) => (): void => {
    setMultiplePositions(
      selectedNodes.map((element) => {
        element.position.left -= ELEMENT_SHIFT_OFFSET;
        return element;
      })
    );
  },
  shiftRight: ({ selectedNodes, setMultiplePositions }: Props) => (): void => {
    setMultiplePositions(
      selectedNodes.map((element) => {
        element.position.left += ELEMENT_SHIFT_OFFSET;
        return element;
      })
    );
  },
  nudgeUp: ({ selectedNodes, setMultiplePositions }: Props) => (): void => {
    setMultiplePositions(
      selectedNodes.map((element) => {
        element.position.top -= ELEMENT_NUDGE_OFFSET;
        return element;
      })
    );
  },
  nudgeDown: ({ selectedNodes, setMultiplePositions }: Props) => (): void => {
    setMultiplePositions(
      selectedNodes.map((element) => {
        element.position.top += ELEMENT_NUDGE_OFFSET;
        return element;
      })
    );
  },
  nudgeLeft: ({ selectedNodes, setMultiplePositions }: Props) => (): void => {
    setMultiplePositions(
      selectedNodes.map((element) => {
        element.position.left -= ELEMENT_NUDGE_OFFSET;
        return element;
      })
    );
  },
  nudgeRight: ({ selectedNodes, setMultiplePositions }: Props) => (): void => {
    setMultiplePositions(
      selectedNodes.map((element) => {
        element.position.left += ELEMENT_NUDGE_OFFSET;
        return element;
      })
    );
  },
};
