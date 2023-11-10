/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface GetRouterLinkPropsDeps {
  href?: string;
  onClick(): void;
}

const isModifiedEvent = (event: React.MouseEvent<HTMLAnchorElement>) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event: React.MouseEvent<HTMLAnchorElement>) => event.button === 0;

export const getRouterLinkProps = ({ href, onClick }: GetRouterLinkPropsDeps) => {
  const guardedClickHandler = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented) {
      return;
    }

    if (isModifiedEvent(event) || !isLeftClickEvent(event)) {
      return;
    }

    // Prevent regular link behavior, which causes a browser refresh.
    event.preventDefault();

    onClick();
  };

  return { href, onClick: guardedClickHandler };
};
