import { action } from '@storybook/addon-actions';
import React from 'react';
import { EditMenu } from '../edit_menu.component';
import { PositionedElement } from '../../../../../types';

const handlers = {
  cutNodes: action('cutNodes'),
  copyNodes: action('copyNodes'),
  pasteNodes: action('pasteNodes'),
  deleteNodes: action('deleteNodes'),
  cloneNodes: action('cloneNodes'),
  bringToFront: action('bringToFront'),
  bringForward: action('bringForward'),
  sendBackward: action('sendBackward'),
  sendToBack: action('sendToBack'),
  alignLeft: action('alignLeft'),
  alignCenter: action('alignCenter'),
  alignRight: action('alignRight'),
  alignTop: action('alignTop'),
  alignMiddle: action('alignMiddle'),
  alignBottom: action('alignBottom'),
  distributeHorizontally: action('distributeHorizontally'),
  distributeVertically: action('distributeVertically'),
  createCustomElement: action('createCustomElement'),
  groupNodes: action('groupNodes'),
  ungroupNodes: action('ungroupNodes'),
  undoHistory: action('undoHistory'),
  redoHistory: action('redoHistory'),
};

export default {
  title: 'components/WorkpadHeader/EditMenu',
};

export const Default = () => (
  <EditMenu selectedNodes={[]} groupIsSelected={false} hasPasteData={false} {...handlers} />
);

Default.story = {
  name: 'default',
};

export const ClipboardDataExists = () => (
  <EditMenu selectedNodes={[]} groupIsSelected={false} hasPasteData={true} {...handlers} />
);

ClipboardDataExists.story = {
  name: 'clipboard data exists',
};

export const SingleElementSelected = () => (
  <EditMenu
    selectedNodes={[{ id: 'foo' }] as PositionedElement[]}
    groupIsSelected={false}
    hasPasteData={false}
    {...handlers}
  />
);

SingleElementSelected.story = {
  name: 'single element selected',
};

export const SingleGroupedElementSelected = () => (
  <EditMenu
    selectedNodes={[{ id: 'foo' }, { id: 'bar' }] as PositionedElement[]}
    groupIsSelected={true}
    hasPasteData={false}
    {...handlers}
  />
);

SingleGroupedElementSelected.story = {
  name: 'single grouped element selected',
};

export const _2ElementsSelected = () => (
  <EditMenu
    selectedNodes={[{ id: 'foo' }, { id: 'bar' }] as PositionedElement[]}
    groupIsSelected={false}
    hasPasteData={false}
    {...handlers}
  />
);

_2ElementsSelected.story = {
  name: '2 elements selected',
};

export const _3ElementsSelected = () => (
  <EditMenu
    selectedNodes={[{ id: 'foo' }, { id: 'bar' }, { id: 'fizz' }] as PositionedElement[]}
    groupIsSelected={false}
    hasPasteData={false}
    {...handlers}
  />
);

_3ElementsSelected.story = {
  name: '3+ elements selected',
};
