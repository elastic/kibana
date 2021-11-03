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
import { ScopedHistory } from 'kibana/public';
import { useNavLinkService } from '../../services';
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

export const App: FC<{ history: ScopedHistory }> = ({ history }) => {
  const historyRef = useRef<History>(createHashStateHistory() as History);
  const { updatePath } = useNavLinkService();

  useEffect(() => {
    return historyRef.current.listen(({ pathname }) => {
      updatePath(pathname);
    });
  });

  // We are using our own history due to needing pushState functionality not yet available on standard history
  // This effect will listen for changes on the scoped history and push that to our history
  // This is needed for SavedObject.resolve redirects
  useEffect(() => {
    return history.listen((location) => {
      historyRef.current.replace(location.hash.substr(1));
    });
  }, [history]);

  return (
    <ShortcutManagerContextWrapper>
      <div className="canvas canvasContainer">
        <CanvasRouter history={historyRef.current} />
      </div>
    </ShortcutManagerContextWrapper>
  );
};
