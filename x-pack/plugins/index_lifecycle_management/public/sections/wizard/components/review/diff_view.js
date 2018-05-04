/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import { EuiCodeEditor } from '@elastic/eui';

import 'brace/mode/json';
import {
  mergeAndPreserveDuplicateKeys,
  removePrefixes,
} from '../../../../lib/diff_tools';
import { addDiffAddonsForAce } from '../../../../lib/diff_ace_addons';

export class DiffView extends PureComponent {
  static propTypes = {
    templateDiff: PropTypes.shape({
      originalFullIndexTemplate: PropTypes.object.isRequired,
      newFullIndexTemplate: PropTypes.object.isRequired,
    }).isRequired,
  };

  render() {
    const {
      templateDiff: { originalFullIndexTemplate, newFullIndexTemplate },
    } = this.props;

    // console.log(JSON.stringify(this.props));

    const mergedJson = mergeAndPreserveDuplicateKeys(
      originalFullIndexTemplate,
      newFullIndexTemplate
    );

    // console.log('mergedJson', mergedJson);

    // Strip the ^ and $ characters
    const mergedJsonAsString = removePrefixes(
      JSON.stringify(mergedJson, null, 2)
    );

    addDiffAddonsForAce(mergedJson);

    return (
      <EuiCodeEditor
        mode="diff_json"
        theme="github"
        width="100%"
        value={mergedJsonAsString}
        setOptions={{
          useWorker: false,
        }}
        editorProps={{
          $blockScrolling: Infinity,
        }}
      />
    );
  }
}
