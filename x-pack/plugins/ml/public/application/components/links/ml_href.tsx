/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { ReactChild } from 'react';
import { useMlKibana, useNavigateToPath } from '../../contexts/kibana';

function isModifiedEvent(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

export const MlHref = ({
  href,
  target,
  onClick,
  children,
  ...rest
}: {
  href: string;
  target?: string;
  onClick?: Function;
  children?: ReactChild;
}) => {
  const {
    services: {
      http: { basePath },
    },
  } = useMlKibana();

  const navigateToPath = useNavigateToPath();
  return (
    <a
      target={target}
      href={basePath.prepend(`/app/ml/${href}`)}
      onClick={(event) => {
        try {
          if (onClick) onClick(event);
        } catch (ex) {
          event.preventDefault();
          throw ex;
        }

        if (
          !event.defaultPrevented && // onClick prevented default
          event.button === 0 && // ignore everything but left clicks
          (!target || target === '_self') && // let browser handle "target=_blank" etc.
          !isModifiedEvent(event) // ignore clicks with modifier keys
        ) {
          event.preventDefault();
          navigateToPath(href);
          return false;
        }
        return true;
      }}
      {...rest}
    >
      {children}
    </a>
  );
};
