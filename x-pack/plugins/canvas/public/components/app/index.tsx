/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScopedHistory } from '@kbn/core/public';
import PropTypes from 'prop-types';
import React, { FC, useEffect } from 'react';
// @ts-expect-error
import { shortcutManager } from '../../lib/shortcut_manager';
import { CanvasRouter } from '../../routes';
import { useNavLinkService } from '../../services';
import { Flyouts } from '../flyouts';

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
  const { updatePath } = useNavLinkService();

  useEffect(() => {
    return history.listen(({ pathname, search }) => {
      updatePath(pathname + search);
    });
  });

  return (
    <ShortcutManagerContextWrapper>
      <div className="canvas canvasContainer">
        <CanvasRouter history={history} />
        <Flyouts />
      </div>
    </ShortcutManagerContextWrapper>
  );
};
