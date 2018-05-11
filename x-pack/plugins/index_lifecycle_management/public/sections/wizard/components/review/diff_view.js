/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiCodeEditor,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
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

    // console.log(JSON.stringify(this.props));

    const { result: mergedJson, changes } = mergeAndPreserveDuplicateKeys(
      originalFullIndexTemplate,
      newFullIndexTemplate
    );

    console.log('mergedJson', mergedJson, changes);

    // Strip the ^ and $ characters
    const mergedJsonAsString = removePrefixes(
      JSON.stringify(mergedJson, null, 2)
    );

    // console.log('mergedJsonAsString', mergedJsonAsString);

    setCurrentJsonObject(mergedJson);
    addDiffAddonsForAce();

    return (
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiDescriptionList>
            {changes.map(({ key, original, updated }) => (
              <Fragment key={key}>
                <EuiDescriptionListTitle>
                  <EuiButtonEmpty onClick={() => this.scrollToKey(key, updated)}>
                    {key}
                  </EuiButtonEmpty>
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  {original ? (
                    <span>
                      Changing `{JSON.stringify(original)}` to `{JSON.stringify(updated)}``
                    </span>
                  ) : (
                    <span>Adding with `{JSON.stringify(updated)}`</span>
                  )}
                </EuiDescriptionListDescription>
              </Fragment>
            ))}
          </EuiDescriptionList>
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
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
