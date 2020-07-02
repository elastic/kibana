/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, MouseEvent } from 'react';
import PropTypes from 'prop-types';
import { EuiLink, EuiLinkProps } from '@elastic/eui';

import { ComponentStrings } from '../../../i18n';

const { Link: strings } = ComponentStrings;

const isModifiedEvent = (ev: MouseEvent) =>
  !!(ev.metaKey || ev.altKey || ev.ctrlKey || ev.shiftKey);

interface Props {
  name: string;
  params: Record<string, any>;
}

export const Link: FC<Props & EuiLinkProps> = (
  { onClick, target, name, params, children, ...linkArgs },
  { router }
) => {
  const navigateTo = (ev: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => {
    if (onClick) {
      onClick(ev);
    }

    if (
      !ev.defaultPrevented && // onClick prevented default
      ev.button === 0 && // ignore everything but left clicks
      !target && // let browser handle "target=_blank" etc.
      !isModifiedEvent(ev) // ignore clicks with modifier keys
    ) {
      ev.preventDefault();
      router.navigateTo(name, params);
    }
  };

  try {
    const href = router.getFullPath(router.create(name, params));
    const props = {
      target,
      href,
      onClick: navigateTo,
      ...linkArgs,
    };

    return <EuiLink {...props}>{children}</EuiLink>;
  } catch (e) {
    return <div>{strings.getErrorMessage(e.message)}</div>;
  }
};

Link.contextTypes = {
  router: PropTypes.object,
};

Link.propTypes = {
  name: PropTypes.string.isRequired,
  params: PropTypes.object,
};
