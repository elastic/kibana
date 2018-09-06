/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiCodeEditor,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiToolTip,
  EuiCode,
} from '@elastic/eui';
import ace from 'brace';
import 'brace/mode/json';
import {
  mergeAndPreserveDuplicateKeys,
  removePrefixes,
} from '../../../../lib/diff_tools';
import { addDiffAddonsForAce, setCurrentJsonObject } from '../../../../lib/diff_ace_addons';

export class DiffView extends PureComponent {
  static propTypes = {
    templateDiff: PropTypes.shape({
      originalFullIndexTemplate: PropTypes.object.isRequired,
      newFullIndexTemplate: PropTypes.object.isRequired,
    }).isRequired,
  };

  scrollToKey = (key, value) => {
    const editorDom = this.aceEditor.aceEditor.refEditor;
    const editor = ace.edit(editorDom);
    const escapedValue = value.replace(/\^/g, '\\^');
    const range = editor.find(new RegExp(`"${key}"\\s*:\\s*"*(${escapedValue})"*`), { regex: true });
    if (!range) {
      return;
    }
    editor.gotoLine(range.start.row + 1, range.start.column);
  }

  render() {
    const {
      templateDiff: { originalFullIndexTemplate, newFullIndexTemplate },
    } = this.props;

    const { result: mergedJson, changes } = mergeAndPreserveDuplicateKeys(
      originalFullIndexTemplate,
      newFullIndexTemplate
    );

    // Strip the ^ and $ characters
    const mergedJsonAsString = removePrefixes(
      JSON.stringify(mergedJson, null, 2)
    );

    setCurrentJsonObject(mergedJson);
    addDiffAddonsForAce();

    return (
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={1} className="ilmDiff__nav">
          <ul>
            {changes.map(({ key, original, updated }) => (
              <li key={key}>
                <EuiToolTip
                  title={original ? "Change" : "Addition"}
                  content={original ? (
                    <span>
                      Changing the value of <EuiCode>{key}</EuiCode> from <EuiCode>{JSON.stringify(original)}</EuiCode>
                      to <EuiCode>{JSON.stringify(updated)}</EuiCode>
                    </span>
                  ) : (
                    <span>Setting a value of <EuiCode>{JSON.stringify(updated)}</EuiCode> for <EuiCode>{key}</EuiCode></span>
                  )}
                >
                  <EuiButtonEmpty size="s" onClick={() => this.scrollToKey(key, updated)}>
                    {key}
                  </EuiButtonEmpty>
                </EuiToolTip>
              </li>
            ))}
          </ul>
        </EuiFlexItem>
        <EuiFlexItem grow={3} className="ilmDiff__code">
          <EuiCodeEditor
            ref={aceEditor => (this.aceEditor = aceEditor)}
            mode="diff_json"
            theme="github"
            width="100%"
            value={mergedJsonAsString}
            setOptions={{
              useWorker: false,
              readOnly: true,
            }}
            editorProps={{
              $blockScrolling: Infinity,
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
