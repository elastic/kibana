/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type cytoscape from 'cytoscape';
import userIcon from './icons/user.svg';
import nodeIcon from './icons/node.svg';
import hostIcon from './icons/storage.svg';
import fileIcon from './icons/document.svg';
import alertIcon from './icons/warning.svg';
import eventIcon from './icons/analyzeEvent.svg';

export function iconForNode(node: cytoscape.NodeSingular) {
  switch (node.data('type')) {
    case 'user':
      return userIcon;
    case 'host':
      return hostIcon;
    case 'alert':
      return alertIcon;
    case 'file':
      return fileIcon;
    case 'event':
      return eventIcon;
  }
  return nodeIcon;
}
