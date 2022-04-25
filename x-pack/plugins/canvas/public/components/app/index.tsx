/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useRef, useEffect } from 'react';
import { Observable } from 'rxjs';
import PropTypes from 'prop-types';
import { History } from 'history';
// @ts-expect-error
import createHashStateHistory from 'history-extra/dist/createHashStateHistory';
import { ScopedHistory } from '@kbn/core/public';
import { skipWhile, timeout, take } from 'rxjs/operators';
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

  useEffect(() => {
    return history.listen(({ pathname, hash }) => {
      // The scoped history could have something that triggers a url change, and that change is not seen by
      // our hash router.  For example, a scopedHistory.replace() as done as part of the saved object resolve
      // alias match flow will do the replace on the scopedHistory, and our app doesn't react appropriately

      // So, to work around this, whenever we see a url on the scoped history, we're going to wait a beat and see
      // if it shows up in our hash router. If it doesn't, then we're going to force it onto our hash router

      // I don't like this at all, and to overcome this we should switch away from hash router sooner rather than later
      // and just use scopedHistory as our history object
      const expectedPath = hash.substr(1);
      const action = history.action;

      // Observable of all the path
      const hashPaths$ = new Observable<string>((subscriber) => {
        subscriber.next(historyRef.current.location.pathname);

        const unsubscribeHashListener = historyRef.current.listen(({ pathname: newPath }) => {
          subscriber.next(newPath);
        });

        return unsubscribeHashListener;
      });

      const subscription = hashPaths$
        .pipe(
          skipWhile((value) => value !== expectedPath),
          timeout(100),
          take(1)
        )
        .subscribe({
          error: (e) => {
            if (action === 'REPLACE') {
              historyRef.current.replace(expectedPath);
            } else {
              historyRef.current.push(expectedPath);
            }
          },
        });

      window.setTimeout(() => subscription.unsubscribe(), 150);
    });
  }, [history, historyRef]);

  return (
    <ShortcutManagerContextWrapper>
      <div className="canvas canvasContainer">
        <CanvasRouter history={historyRef.current} />
      </div>
    </ShortcutManagerContextWrapper>
  );
};
