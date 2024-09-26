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
import { navLinksService } from '../../services/kibana_services';
import { Flyouts } from '../flyouts';

class ShortcutManagerContextWrapper extends React.Component<React.PropsWithChildren<{}>> {
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
  useEffect(() => {
    return history.listen(({ pathname, search }) => {
      navLinksService.updatePath(pathname + search);
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
