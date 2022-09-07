/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as theme } from '@kbn/ui-theme';
import { EQL_THEME_NAME } from './constants';

// @ts-expect-error
ace.define(
  EQL_THEME_NAME,
  ['require', 'exports', 'module', 'ace/lib/dom'],
  function (acequire: any, exports: any) {
    exports.isDark = false;
    exports.cssClass = 'ace-eql';
    exports.cssText = `
      .ace-eql .ace_scroller {
        background-color: transparent;
      }
      .ace-eql .ace_marker-layer .ace_selection {
        background: rgb(181, 213, 255);
      }
      .ace-eql .ace_placeholder {
        color: ${theme.euiTextSubduedColor};
        padding: 0;
      }
      .ace-eql .ace_sequence,
      .ace-eql .ace_where,
      .ace-eql .ace_until {
        color: ${theme.euiColorDarkShade};
      }
      .ace-eql .ace_sequence_item_start,
      .ace-eql .ace_sequence_item_end,
      .ace-eql .ace_operator,
      .ace-eql .ace_logical_operator {
        color: ${theme.euiColorMediumShade};
      }
      .ace-eql .ace_value,
      .ace-eql .ace_bool_condition {
        color: ${theme.euiColorAccent};
      }
      .ace-eql .ace_event_type,
      .ace-eql .ace_field {
        color: ${theme.euiColorPrimaryText};
      }
      // .ace-eql .ace_gutter {
      //   color: #333;
      // }
      .ace-eql .ace_print-margin {
        width: 1px;
        background: #e8e8e8;
      }
      .ace-eql .ace_fold {
        background-color: #6B72E6;
      }
      .ace-eql .ace_cursor {
        color: black;
      }
      .ace-eql .ace_invisible {
        color: rgb(191, 191, 191);
      }
      .ace-eql .ace_marker-layer .ace_selection {
        background: rgb(181, 213, 255);
      }
      .ace-eql.ace_multiselect .ace_selection.ace_start {
        box-shadow: 0 0 3px 0px white;
      }
      .ace-eql .ace_marker-layer .ace_step {
        background: rgb(252, 255, 0);
      }
      .ace-eql .ace_marker-layer .ace_stack {
        background: rgb(164, 229, 101);
      }
      .ace-eql .ace_marker-layer .ace_bracket {
        margin: -1px 0 0 -1px;
        border: 1px solid rgb(192, 192, 192);
      }
      .ace-eql .ace_marker-layer .ace_selected-word {
        background: rgb(250, 250, 255);
        border: 1px solid rgb(200, 200, 250);
      }
      .ace-eql .ace_indent-guide {
        background: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAE0lEQVQImWP4////f4bLly//BwAmVgd1/w11/gAAAABJRU5ErkJggg==") right repeat-y;
      }`;

    const dom = acequire('../lib/dom');
    dom.importCssString(exports.cssText, exports.cssClass);
  }
);
