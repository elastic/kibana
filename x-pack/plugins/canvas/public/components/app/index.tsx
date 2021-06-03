/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { History } from 'history';
// @ts-expect-error
import createHashStateHistory from 'history-extra/dist/createHashStateHistory';
import { useServices } from '../../services';
// @ts-expect-error
import { shortcutManager } from '../../lib/shortcut_manager';
import { CanvasRouter } from '../../routes';

class ShortcutManagerContextWrapper extends React.Component {
  static childContextTypes = {
    shortcuts: PropTypes.object.isRequired,
  };

  getChildContext() {
    return { shortcuts: shortcutManager };
  }

  render() {
    return <>{this.props.children}</>;
  }
}

export const App: FC = () => {
  const historyRef = useRef<History>(createHashStateHistory() as History);
  const services = useServices();

  useEffect(() => {
    return historyRef.current.listen(({ pathname }) => {
      services.navLink.updatePath(pathname);
    });
  });

  return (
    <ShortcutManagerContextWrapper>
      <div className="canvas canvasContainer">
        <CanvasRouter history={historyRef.current} />
      </div>
    </ShortcutManagerContextWrapper>
  );
};
