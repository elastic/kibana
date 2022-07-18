/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MouseEvent } from 'react';
import { History } from 'history';
import { ChromeBreadcrumb } from '@kbn/core/public';
import { getUntitledWorkpadLabel } from './doc_title';

const isModifiedEvent = (event: MouseEvent) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event: MouseEvent) => event.button === 0;

const isTargetBlank = (event: MouseEvent) => {
  const target = (event.target as HTMLElement).getAttribute('target');
  return target && target !== '_self';
};

export const getBaseBreadcrumb = (history: History): ChromeBreadcrumb => {
  const path = '/';
  const href = history.createHref({ pathname: path });

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented) {
      return;
    }

    // Let the browser handle links that open new tabs/windows
    if (isModifiedEvent(event) || !isLeftClickEvent(event) || isTargetBlank(event)) {
      return;
    }

    // Prevent regular link behavior, which causes a browser refresh.
    event.preventDefault();

    // Push the route to the history.
    history.push(path);
  };

  return {
    text: 'Canvas',
    href,
    onClick,
  };
};

export const getWorkpadBreadcrumb = ({ name }: { name?: string }): ChromeBreadcrumb => ({
  text: name || getUntitledWorkpadLabel(),
});
