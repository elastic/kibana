/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { EditMenu } from '../edit_menu';
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

storiesOf('components/WorkpadHeader/EditMenu', module)
  .add('default', () => (
    <EditMenu selectedNodes={[]} groupIsSelected={false} hasPasteData={false} {...handlers} />
  ))
  .add('clipboard data exists', () => (
    <EditMenu selectedNodes={[]} groupIsSelected={false} hasPasteData={true} {...handlers} />
  ))
  .add('single element selected', () => (
    <EditMenu
      selectedNodes={[{ id: 'foo' }] as PositionedElement[]}
      groupIsSelected={false}
      hasPasteData={false}
      {...handlers}
    />
  ))
  .add('single grouped element selected', () => (
    <EditMenu
      selectedNodes={[{ id: 'foo' }, { id: 'bar' }] as PositionedElement[]}
      groupIsSelected={true}
      hasPasteData={false}
      {...handlers}
    />
  ))
  .add('2 elements selected', () => (
    <EditMenu
      selectedNodes={[{ id: 'foo' }, { id: 'bar' }] as PositionedElement[]}
      groupIsSelected={false}
      hasPasteData={false}
      {...handlers}
    />
  ))
  .add('3+ elements selected', () => (
    <EditMenu
      selectedNodes={[{ id: 'foo' }, { id: 'bar' }, { id: 'fizz' }] as PositionedElement[]}
      groupIsSelected={false}
      hasPasteData={false}
      {...handlers}
    />
  ));
