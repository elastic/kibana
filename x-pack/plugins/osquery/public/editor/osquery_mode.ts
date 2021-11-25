/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import ace from 'brace';
import 'brace/mode/sql';
import 'brace/ext/language_tools';
import { AceInterface } from './ace_types';
import './osquery_highlight_rules';

(ace as unknown as AceInterface).define(
  'ace/mode/osquery',
  ['require', 'exports', 'ace/mode/sql', 'ace/mode/osquery_highlight_rules'],
  // eslint-disable-next-line prefer-arrow-callback
  function (acequire, exports) {
    const TextMode = acequire('./sql').Mode;
    const OsqueryHighlightRules = acequire('./osquery_highlight_rules').OsqueryHighlightRules;

    class Mode extends TextMode {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(...args: any[]) {
        super(...args);
        this.HighlightRules = OsqueryHighlightRules;
      }
    }

    Mode.prototype.lineCommentStart = '--';
    Mode.prototype.$id = 'ace/mode/osquery';

    exports.Mode = Mode;
  }
);
